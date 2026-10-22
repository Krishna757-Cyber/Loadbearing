import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  KIND_WEIGHT,
  makeId,
  makeError,
  type ErrorCode,
  type LoadEntry,
  type Moment,
  type Handoff,
  type Proposal,
  type RoutingPreference,
  DEMO_ACK_MINUTES,
} from "@loadbearing/shared";
import type { StorageAdapter, StorageOp } from "./storage/types.js";
import type { ClockManager } from "./clock.js";
import {
  classifyWithRules,
  explainWithRules,
  writeBriefWithRules,
  checkEmergency,
} from "./agents/rules.js";
import {
  route,
  inSleepWindow,
  findDuplicate,
  computeRebalance,
  loadShares,
  localTime,
  type RankedCandidate,
} from "followthesun-router";
import {
  areAllCaregiversConsented,
  isMomentVisibleToViewer,
} from "./privacy.js";

function errorResponse(code: ErrorCode, message: string, fix?: string, requestId?: string) {
  const env = makeError(code, message, fix, requestId);
  return {
    isError: true,
    content: [{ type: "text" as const, text: `[${code}] ${message}` }],
    structuredContent: env,
  };
}

function successResponse(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function registerAllTools(
  server: McpServer,
  storage: StorageAdapter,
  clock: ClockManager,
  onStateChanged?: () => void
): void {
  // ─── 1. capture_moment ────────────────────────────────────────────────────
  server.registerTool(
    "capture_moment",
    {
      title: "Capture Moment",
      description:
        "Capture a spoken, doorstep, or manual moment. Performs emergency check, classification, deduplication, and credits past work.",
      inputSchema: {
        text: z.string().min(1).max(600),
        source: z.enum(["voice", "doorstep", "manual"]),
        captured_by: z.string().min(1),
        language: z.enum(["en", "hi"]).optional(),
        request_id: z.string().optional(),
      },
    },
    async ({ text, source, captured_by, request_id }) => {
      try {
        if (request_id) {
          const cached = await storage.getIdempotency(`capture_moment#${request_id}`);
          if (cached) return successResponse(cached as Record<string, unknown>);
        }

        const household = await storage.loadHousehold();
        const now = clock.now();
        const momentId = makeId("mo");
        const ops: StorageOp[] = [];

        // Emergency Lexicon First
        const isEmergency = checkEmergency(text);
        if (isEmergency) {
          const emergencyMoment: Moment = {
            id: momentId,
            source,
            text,
            capturedBy: captured_by,
            capturedAt: now,
            classification: {
              kind: "care_task",
              loadKind: "doing",
              urgency: "urgent_not_emergency",
              needsLocalPresence: true,
              summary: "Emergency event detected from voice/text input",
              sensitive: true,
              emergency: true,
            },
            credits: [],
            privacy: "household",
            sharedWith: household.members
              .filter((m) => m.role === "caregiver")
              .map((c) => c.id),
            duplicateOf: null,
            expiresAt: null,
            aiSource: "rules",
            version: 1,
          };

          ops.push({ type: "put_moment", moment: emergencyMoment });
          ops.push({
            type: "add_audit",
            audit: {
              at: now,
              actorId: captured_by,
              action: "emergency_captured",
              details: "Emergency alert triggered",
            },
          });

          const result = {
            moment_id: momentId,
            classification: emergencyMoment.classification,
            credits: [],
            duplicate_of: null,
            next: "emergency_card" as const,
            ai_source: "rules" as const,
            message: "Emergency detected. Emergency card displayed.",
          };

          if (request_id) {
            ops.push({
              type: "put_idempotency",
              key: `capture_moment#${request_id}`,
              result,
              expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
            });
          }

          await storage.transact(ops, household.version);
          if (onStateChanged) onStateChanged();
          return successResponse(result);
        }

        // Classifier (rules)
        const { classification, credits } = classifyWithRules(text);

        // Deduplication check (deterministic 48h)
        const dedupeCandidates = household.moments.map((m) => ({
          id: m.id,
          text: m.text,
          capturedAt: m.capturedAt,
          status: household.handoffs.find((h) => h.momentId === m.id)?.status,
        }));
        const duplicateId = findDuplicate(text, dedupeCandidates, now);

        let next: "ask_consent" | "logged_only" | "emergency_card" | "duplicate" =
          "ask_consent";
        let message = "Moment captured.";

        if (duplicateId) {
          next = "duplicate";
          message = "Near-duplicate moment detected within 48h.";
        } else if (source === "doorstep") {
          next = "ask_consent";
          message = text.toLowerCase().includes("delivery")
            ? "A delivery needs acknowledgement. Assign someone to check it?"
            : "A visitor is at the door. Assign someone to check in?";
        } else if (credits.length > 0 && classification.kind !== "care_task") {
          next = "logged_only";
          message = "Past care work credited.";
        }

        const expiresAt =
          source === "doorstep"
            ? new Date(clock.nowMs() + 48 * 60 * 60 * 1000).toISOString()
            : null;

        const privacy = source === "doorstep" ? "household" : "private";
        const sharedWith =
          source === "doorstep"
            ? household.members.filter((m) => m.role === "caregiver").map((c) => c.id)
            : [captured_by];

        const moment: Moment = {
          id: momentId,
          source,
          text,
          capturedBy: captured_by,
          capturedAt: now,
          classification,
          credits,
          privacy,
          sharedWith,
          duplicateOf: duplicateId,
          expiresAt,
          aiSource: "rules",
          version: 1,
        };

        ops.push({ type: "put_moment", moment });

        // Credit past work with LoadEntries
        const captorMember = household.members.find((m) => m.id === captured_by);
        for (const credit of credits) {
          if (captorMember) {
            const inSleep = inSleepWindow(captorMember, now);
            const multiplier = inSleep ? 2 : 1;
            const baseWeight = KIND_WEIGHT[credit.loadKind];
            const loadEntry: LoadEntry = {
              id: makeId("le"),
              memberId: captured_by,
              kind: credit.loadKind,
              label: credit.label,
              baseWeight,
              performedAt: now,
              inSleepWindow: inSleep,
              multiplier,
              effectiveWeight: baseWeight * multiplier,
              momentId: moment.id,
              handoffId: null,
            };
            ops.push({ type: "put_load_entry", entry: loadEntry });
          }
        }

        const result = {
          moment_id: momentId,
          classification,
          credits,
          duplicate_of: duplicateId,
          next,
          ai_source: "rules" as const,
          message,
        };

        if (request_id) {
          ops.push({
            type: "put_idempotency",
            key: `capture_moment#${request_id}`,
            result,
            expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
          });
        }

        await storage.transact(ops, household.version);
        if (onStateChanged) onStateChanged();
        return successResponse(result);
      } catch (err: unknown) {
        const error = err as Error;
        return errorResponse("INTERNAL", error.message, undefined, request_id);
      }
    }
  );

  // ─── 2. create_handoff ────────────────────────────────────────────────────
  server.registerTool(
    "create_handoff",
    {
      title: "Create Handoff",
      description:
        "Share a moment with family caregivers and route care tasks using Follow-the-Sun logic.",
      inputSchema: {
        moment_id: z.string().min(1),
        share_with: z.array(z.string().min(1)),
        actor_id: z.string().min(1),
        preferred_assignee: z.string().optional(),
        request_id: z.string().optional(),
      },
    },
    async ({ moment_id, share_with, actor_id, preferred_assignee: _preferred_assignee, request_id }) => {
      try {
        if (request_id) {
          const cached = await storage.getIdempotency(`create_handoff#${request_id}`);
          if (cached) return successResponse(cached as Record<string, unknown>);
        }

        const household = await storage.loadHousehold();
        const moment = household.moments.find((m) => m.id === moment_id);
        if (!moment) {
          return errorResponse("NOT_FOUND", `Moment ${moment_id} not found`, undefined, request_id);
        }

        const now = clock.now();
        const handoffId = makeId("h");
        const ops: StorageOp[] = [];

        // Caregivers only — never include recipient (Dadi) in work candidates
        const caregiverShareWith = share_with.filter((id) => id !== "dadi");
        const updatedSharedWith = Array.from(
          new Set([...moment.sharedWith, ...caregiverShareWith])
        );

        const updatedMoment: Moment = {
          ...moment,
          privacy: "shared",
          sharedWith: updatedSharedWith,
          version: moment.version + 1,
        };
        ops.push({ type: "update_moment", moment: updatedMoment });

        const allConsented = areAllCaregiversConsented(household.members);
        const caregivers = household.members.filter((m) => m.role === "caregiver");

        if (moment.classification.kind === "memory") {
          const handoff: Handoff = {
            id: handoffId,
            momentId: moment.id,
            type: "memory",
            status: "shared",
            assigneeId: null,
            skippedIds: [],
            attempts: 0,
            ackDeadline: null,
            explanation: {
              language: "en",
              text: "Family memory shared with circle.",
            },
            reasonCodes: [],
            history: [
              {
                at: now,
                actorId: actor_id,
                action: "shared",
                details: "Memory shared with circle",
              },
            ],
            createdAt: now,
            version: 1,
          };

          ops.push({ type: "put_handoff", handoff });

          const result = {
            handoff_id: handoffId,
            status: "shared",
            assignee_id: null,
            ranked: [],
            explanation: handoff.explanation.text,
            ack_deadline: null,
            ai_source: "rules" as const,
          };

          if (request_id) {
            ops.push({
              type: "put_idempotency",
              key: `create_handoff#${request_id}`,
              result,
              expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
            });
          }

          await storage.transact(ops, household.version);
          if (onStateChanged) onStateChanged();
          return successResponse(result);
        }

        // Task routing: candidateIds = share_with minus captor (unless doorstep/system)
        const candidateIds = caregiverShareWith.filter((id) =>
          actor_id === "system" ? true : id !== actor_id
        );

        const backupMember = caregivers.find((c) => c.isBackup);
        const kind = moment.classification.loadKind ?? "doing";

        const routeResult = route({
          caregivers,
          entries: household.loadEntries,
          openTasks: household.handoffs,
          now,
          needsLocalPresence: moment.classification.needsLocalPresence,
          kind,
          candidateIds:
            candidateIds.length > 0 ? candidateIds : caregivers.map((c) => c.id),
          excludeIds: [],
          preferences: household.preferences,
          backupMember,
        });

        const status =
          routeResult.status === "assigned"
            ? "awaiting_acceptance"
            : routeResult.status === "backup"
            ? "awaiting_acceptance"
            : "unassigned";

        const assigneeId = routeResult.assigneeId;
        const ackDeadline =
          assigneeId && status === "awaiting_acceptance"
            ? new Date(clock.nowMs() + DEMO_ACK_MINUTES * 60 * 1000).toISOString()
            : null;

        const assignee = caregivers.find((c) => c.id === assigneeId);
        const explanationText = assignee
          ? explainWithRules({
              assigneeName: assignee.name,
              assigneeLocalTime: localTime(assignee, now).toFormat("HH:mm"),
              targetLanguage: assignee.language,
              loadVisible: allConsented,
              reasonCodes: routeResult.reasonCodes,
              isBackup: routeResult.status === "backup",
            })
          : "No caregiver currently available and awake.";

        const handoff: Handoff = {
          id: handoffId,
          momentId: moment.id,
          type: "task",
          status,
          assigneeId,
          skippedIds: [],
          attempts: 1,
          ackDeadline,
          explanation: {
            language: assignee?.language ?? "en",
            text: explanationText,
          },
          reasonCodes: routeResult.reasonCodes,
          history: [
            {
              at: now,
              actorId: actor_id,
              action: "created",
              details: `Task handoff created and assigned to ${assigneeId ?? "unassigned"}`,
            },
          ],
          createdAt: now,
          version: 1,
        };

        ops.push({ type: "put_handoff", handoff });

        // Privacy rule on ranked candidates:
        // "ranked (share_pct null unless load is visible)"
        const rankedOutput = routeResult.ranked.map((r: RankedCandidate) => ({
          ...r,
          sharePct: allConsented ? r.sharePct : null,
        }));

        const result = {
          handoff_id: handoffId,
          status,
          assignee_id: assigneeId,
          ranked: rankedOutput,
          explanation: explanationText,
          ack_deadline: ackDeadline,
          ai_source: "rules" as const,
        };

        if (request_id) {
          ops.push({
            type: "put_idempotency",
            key: `create_handoff#${request_id}`,
            result,
            expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
          });
        }

        await storage.transact(ops, household.version);
        if (onStateChanged) onStateChanged();
        return successResponse(result);
      } catch (err: unknown) {
        const error = err as Error;
        return errorResponse("INTERNAL", error.message, undefined, request_id);
      }
    }
  );

  // ─── 3. record_resolution ─────────────────────────────────────────────────
  server.registerTool(
    "record_resolution",
    {
      title: "Record Resolution",
      description:
        "Accept, decline, or resolve an assigned handoff task. Only assignee may act. Resolving records a credited load entry.",
      inputSchema: {
        handoff_id: z.string().min(1),
        actor_id: z.string().min(1),
        outcome: z.enum(["accepted", "declined", "resolved"]),
        note: z.string().max(280).optional(),
        request_id: z.string().optional(),
      },
    },
    async ({ handoff_id, actor_id, outcome, note, request_id }) => {
      try {
        if (request_id) {
          const cached = await storage.getIdempotency(`record_resolution#${request_id}`);
          if (cached) return successResponse(cached as Record<string, unknown>);
        }

        const household = await storage.loadHousehold();
        const handoff = household.handoffs.find((h) => h.id === handoff_id);
        if (!handoff) {
          return errorResponse("NOT_FOUND", `Handoff ${handoff_id} not found`, undefined, request_id);
        }

        // "Only the assignee may act."
        if (handoff.assigneeId !== actor_id) {
          return errorResponse(
            "FORBIDDEN",
            `Actor ${actor_id} is not the assignee of handoff ${handoff_id}`,
            "Switch to the active assignee before accepting or resolving",
            request_id
          );
        }

        const now = clock.now();
        const ops: StorageOp[] = [];
        const caregivers = household.members.filter((m) => m.role === "caregiver");
        const allConsented = areAllCaregiversConsented(household.members);

        let loadEntryCreated: LoadEntry | null = null;
        let newStatus = handoff.status;
        let newAssigneeId: string | null = handoff.assigneeId;

        if (outcome === "accepted") {
          newStatus = "accepted";
          const updatedHandoff: Handoff = {
            ...handoff,
            status: "accepted",
            ackDeadline: null,
            history: [
              ...handoff.history,
              {
                at: now,
                actorId: actor_id,
                action: "accepted",
                details: note ?? "Handoff accepted",
              },
            ],
            version: handoff.version + 1,
          };
          ops.push({ type: "update_handoff", handoff: updatedHandoff });
        } else if (outcome === "declined") {
          // Declined -> reroute
          const skipped = [...handoff.skippedIds, actor_id];
          const moment = household.moments.find((m) => m.id === handoff.momentId);
          const needsLocal = moment?.classification.needsLocalPresence ?? false;
          const kind = moment?.classification.loadKind ?? "doing";
          const candidateIds = (moment?.sharedWith ?? caregivers.map((c) => c.id)).filter(
            (id: string) => !skipped.includes(id)
          );

          const routeRes = route({
            caregivers,
            entries: household.loadEntries,
            openTasks: household.handoffs.filter((h) => h.id !== handoff.id),
            now,
            needsLocalPresence: needsLocal,
            kind,
            candidateIds,
            excludeIds: skipped,
            preferences: household.preferences,
            backupMember: caregivers.find((c) => c.isBackup),
          });

          newAssigneeId = routeRes.assigneeId;
          newStatus = newAssigneeId ? "awaiting_acceptance" : "unassigned";
          const ackDeadline = newAssigneeId
            ? new Date(clock.nowMs() + DEMO_ACK_MINUTES * 60 * 1000).toISOString()
            : null;

          const updatedHandoff: Handoff = {
            ...handoff,
            status: newStatus,
            assigneeId: newAssigneeId,
            skippedIds: skipped,
            attempts: handoff.attempts + 1,
            ackDeadline,
            history: [
              ...handoff.history,
              {
                at: now,
                actorId: actor_id,
                action: "declined",
                details: note ?? "Handoff declined and rerouted",
              },
            ],
            version: handoff.version + 1,
          };
          ops.push({ type: "update_handoff", handoff: updatedHandoff });
        } else if (outcome === "resolved") {
          // "resolved (requires accepted) -> close, write a LoadEntry for the resolver"
          if (handoff.status !== "accepted") {
            return errorResponse(
              "VALIDATION",
              "Task must be accepted before it can be marked resolved",
              "Call record_resolution with outcome 'accepted' first",
              request_id
            );
          }

          newStatus = "resolved";
          const moment = household.moments.find((m) => m.id === handoff.momentId);
          const actorMember = caregivers.find((c) => c.id === actor_id);
          const kind = moment?.classification.loadKind ?? "doing";
          const baseWeight = KIND_WEIGHT[kind];
          const inSleep = actorMember ? inSleepWindow(actorMember, now) : false;
          const multiplier = inSleep ? 2 : 1;

          loadEntryCreated = {
            id: makeId("le"),
            memberId: actor_id,
            kind,
            label: moment?.classification.summary ?? "Resolved task",
            baseWeight,
            performedAt: now,
            inSleepWindow: inSleep,
            multiplier,
            effectiveWeight: baseWeight * multiplier,
            momentId: handoff.momentId,
            handoffId: handoff.id,
          };
          ops.push({ type: "put_load_entry", entry: loadEntryCreated });

          const updatedHandoff: Handoff = {
            ...handoff,
            status: "resolved",
            history: [
              ...handoff.history,
              {
                at: now,
                actorId: actor_id,
                action: "resolved",
                details: note ?? "Task resolved",
              },
            ],
            version: handoff.version + 1,
          };
          ops.push({ type: "update_handoff", handoff: updatedHandoff });
        }

        // Compute updated shares
        const allEntries = loadEntryCreated
          ? [...household.loadEntries, loadEntryCreated]
          : household.loadEntries;
        const sharesMap = loadShares(caregivers, allEntries, now);
        const sharesOutput: Record<string, number | null> = {};
        for (const c of caregivers) {
          sharesOutput[c.id] = allConsented ? sharesMap.get(c.id) ?? 0 : null;
        }

        const result = {
          handoff_id,
          status: newStatus,
          assignee_id: newAssigneeId,
          load_entry: loadEntryCreated,
          shares: allConsented ? sharesOutput : null,
        };

        if (request_id) {
          ops.push({
            type: "put_idempotency",
            key: `record_resolution#${request_id}`,
            result,
            expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
          });
        }

        await storage.transact(ops, household.version);
        if (onStateChanged) onStateChanged();
        return successResponse(result);
      } catch (err: unknown) {
        const error = err as Error;
        return errorResponse("INTERNAL", error.message, undefined, request_id);
      }
    }
  );

  // ─── 4. propose_rebalance ─────────────────────────────────────────────────
  server.registerTool(
    "propose_rebalance",
    {
      title: "Propose Rebalance",
      description:
        "Propose load rebalancing across caregivers if everyone consented, or approve a proposal.",
      inputSchema: {
        window_days: z.number().int().min(1).max(14).default(7),
        approve_proposal_id: z.string().optional(),
        approved_by: z.string().optional(),
        request_id: z.string().optional(),
      },
    },
    async ({ window_days, approve_proposal_id, approved_by, request_id }) => {
      try {
        if (request_id) {
          const cached = await storage.getIdempotency(`propose_rebalance#${request_id}`);
          if (cached) return successResponse(cached as Record<string, unknown>);
        }

        const household = await storage.loadHousehold();
        const now = clock.now();
        const caregivers = household.members.filter((m) => m.role === "caregiver");
        const ops: StorageOp[] = [];

        // Case A: Approve an existing proposal
        if (approve_proposal_id && approved_by) {
          const proposal = household.proposals.find((p) => p.id === approve_proposal_id);
          if (!proposal) {
            return errorResponse(
              "NOT_FOUND",
              `Proposal ${approve_proposal_id} not found`,
              undefined,
              request_id
            );
          }
          if (proposal.status !== "proposed") {
            return errorResponse(
              "CONFLICT",
              `Proposal already ${proposal.status}`,
              undefined,
              request_id
            );
          }

          const approvedProposal: Proposal = {
            ...proposal,
            status: "approved",
            approvedBy: approved_by,
          };
          ops.push({ type: "update_proposal", proposal: approvedProposal });

          // Create RoutingPreference from proposal moves
          const createdPrefs: RoutingPreference[] = [];
          for (const move of proposal.moves) {
            const pref: RoutingPreference = {
              id: makeId("pref"),
              memberId: move.toMemberId,
              kind: move.kind,
              remaining: move.count,
              expiresAt: new Date(clock.nowMs() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            };
            createdPrefs.push(pref);
            ops.push({ type: "put_preference", preference: pref });
          }

          const result = {
            status: "approved",
            proposal_id: approve_proposal_id,
            preferences: createdPrefs,
          };

          if (request_id) {
            ops.push({
              type: "put_idempotency",
              key: `propose_rebalance#${request_id}`,
              result,
              expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
            });
          }

          await storage.transact(ops, household.version);
          if (onStateChanged) onStateChanged();
          return successResponse(result);
        }

        // Case B: Check caregiver consent
        // "If any caregiver has not consented: {visibility 'private_only', consented, missing}."
        const consented = caregivers.filter((c) => c.consentShare).map((c) => c.id);
        const missing = caregivers.filter((c) => !c.consentShare).map((c) => c.id);

        if (missing.length > 0) {
          const result = {
            visibility: "private_only",
            consented,
            missing,
          };
          return successResponse(result);
        }

        // Case C: Everyone consented -> compute rebalance
        const rebalanceResult = computeRebalance({
          caregivers,
          entries: household.loadEntries,
          now,
          windowDays: window_days,
        });

        if (!rebalanceResult) {
          return successResponse({
            status: "balanced",
            message: "Caregiver load is already balanced within fair limits.",
          });
        }

        const proposalId = makeId("prop");
        const proposal: Proposal = {
          id: proposalId,
          createdAt: now,
          expiresAt: new Date(clock.nowMs() + 24 * 60 * 60 * 1000).toISOString(),
          windowDays: window_days,
          before: rebalanceResult.before,
          after: rebalanceResult.after,
          moves: rebalanceResult.moves,
          rationale: rebalanceResult.rationale,
          status: "proposed",
          approvedBy: null,
        };

        ops.push({ type: "put_proposal", proposal });

        const result = {
          ...proposal,
          proposal_id: proposal.id,
          requires_approval: true,
        };

        if (request_id) {
          ops.push({
            type: "put_idempotency",
            key: `propose_rebalance#${request_id}`,
            result,
            expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
          });
        }

        await storage.transact(ops, household.version);
        if (onStateChanged) onStateChanged();
        return successResponse(result);
      } catch (err: unknown) {
        const error = err as Error;
        return errorResponse("INTERNAL", error.message, undefined, request_id);
      }
    }
  );

  // ─── 5. get_continuity_brief ──────────────────────────────────────────────
  server.registerTool(
    "get_continuity_brief",
    {
      title: "Get Continuity Brief",
      description:
        "Generate a warm multilingual continuity summary grounded only in moments the viewer is authorized to see.",
      inputSchema: {
        member_id: z.string().min(1),
        language: z.enum(["en", "hi"]).optional(),
        since: z.string().optional(),
        request_id: z.string().optional(),
      },
    },
    async ({ member_id, language, since, request_id }) => {
      try {
        if (request_id) {
          const cached = await storage.getIdempotency(`get_continuity_brief#${request_id}`);
          if (cached) return successResponse(cached as Record<string, unknown>);
        }

        const household = await storage.loadHousehold();
        const member = household.members.find((m) => m.id === member_id);
        if (!member) {
          return errorResponse("NOT_FOUND", `Member ${member_id} not found`, undefined, request_id);
        }

        const targetLang = language ?? member.language;
        const cutoffMs = since
          ? new Date(since).getTime()
          : clock.nowMs() - 24 * 60 * 60 * 1000;

        // Privacy filtering: only moments this member is authorized to see
        const visibleMoments = household.moments.filter(
          (m) =>
            new Date(m.capturedAt).getTime() >= cutoffMs &&
            isMomentVisibleToViewer(m, member_id, member.role)
        );
        const visibleMomentIds = new Set(visibleMoments.map((m) => m.id));

        const visibleHandoffs = household.handoffs.filter((h) =>
          visibleMomentIds.has(h.momentId)
        );

        const resolvedCount = visibleHandoffs.filter((h) => h.status === "resolved").length;
        const openCount = visibleHandoffs.filter(
          (h) => h.status === "accepted" || h.status === "awaiting_acceptance"
        ).length;
        const memoriesCount = visibleMoments.filter(
          (m) => m.classification.kind === "memory"
        ).length;
        const unownedCount = visibleHandoffs.filter((h) => h.status === "unassigned").length;

        const stats = {
          resolved: resolvedCount,
          open: openCount,
          memories_shared: memoriesCount,
          unowned: unownedCount,
        };

        const briefText = writeBriefWithRules({
          memberName: member.name,
          language: targetLang,
          stats,
        });

        const result = {
          text: briefText,
          stats,
          ai_source: "rules" as const,
        };

        if (request_id) {
          const ops: StorageOp[] = [
            {
              type: "put_idempotency",
              key: `get_continuity_brief#${request_id}`,
              result,
              expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
            },
          ];
          await storage.transact(ops, household.version);
        }

        return successResponse(result);
      } catch (err: unknown) {
        const error = err as Error;
        return errorResponse("INTERNAL", error.message, undefined, request_id);
      }
    }
  );
}
