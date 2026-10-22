import type { StorageAdapter, StorageOp } from "./storage/types.js";
import type { ClockManager } from "./clock.js";
import { evaluateEscalations, route } from "followthesun-router";
import { DEMO_ACK_MINUTES } from "@loadbearing/shared";
import { explainWithRules } from "./agents/rules.js";
import { localTime } from "followthesun-router";
import { areAllCaregiversConsented } from "./privacy.js";

export async function checkAndApplyEscalations(
  storage: StorageAdapter,
  clock: ClockManager,
  ackMinutes = DEMO_ACK_MINUTES
): Promise<{ changed: boolean; version?: number }> {
  const household = await storage.loadHousehold();
  const now = clock.now();
  const actions = evaluateEscalations(household.handoffs, now);

  if (actions.length === 0) {
    return { changed: false };
  }

  const ops: StorageOp[] = [];
  const caregivers = household.members.filter((m) => m.role === "caregiver");
  const allConsented = areAllCaregiversConsented(household.members);

  for (const act of actions) {
    const handoff = household.handoffs.find((h) => h.id === act.handoffId);
    if (!handoff) continue;

    if (act.action === "unassign") {
      const updatedHandoff = {
        ...handoff,
        status: "unassigned" as const,
        ackDeadline: null,
        history: [
          ...handoff.history,
          {
            at: now,
            actorId: "system",
            action: "unassigned",
            details: "Max escalation attempts reached",
          },
        ],
        version: handoff.version + 1,
      };
      ops.push({ type: "update_handoff", handoff: updatedHandoff });
    } else if (act.action === "reroute") {
      const skippedIds = [...handoff.skippedIds];
      if (handoff.assigneeId && !skippedIds.includes(handoff.assigneeId)) {
        skippedIds.push(handoff.assigneeId);
      }

      const moment = household.moments.find((m) => m.id === handoff.momentId);
      const needsLocal = moment?.classification.needsLocalPresence ?? false;
      const loadKind = moment?.classification.loadKind ?? "doing";

      const candidateIds = (moment?.sharedWith ?? caregivers.map((c) => c.id)).filter(
        (id: string) => id !== moment?.capturedBy
      );

      const backup = caregivers.find((c) => c.isBackup);

      const routeRes = route({
        caregivers,
        entries: household.loadEntries,
        openTasks: household.handoffs.filter((h) => h.id !== handoff.id),
        now,
        needsLocalPresence: needsLocal,
        kind: loadKind,
        candidateIds,
        excludeIds: skippedIds,
        preferences: household.preferences,
        backupMember: backup,
      });

      const nextAttempts = handoff.attempts + 1;
      let newStatus = handoff.status;
      let newAssigneeId = handoff.assigneeId;
      let newAckDeadline: string | null = null;

      if (routeRes.status === "assigned" && routeRes.assigneeId) {
        newStatus = "awaiting_acceptance";
        newAssigneeId = routeRes.assigneeId;
        newAckDeadline = new Date(clock.nowMs() + ackMinutes * 60 * 1000).toISOString();
      } else if (routeRes.status === "backup" && routeRes.assigneeId) {
        newStatus = "awaiting_acceptance";
        newAssigneeId = routeRes.assigneeId;
        newAckDeadline = new Date(clock.nowMs() + ackMinutes * 60 * 1000).toISOString();
      } else {
        newStatus = "unassigned";
        newAssigneeId = null;
        newAckDeadline = null;
      }

      const assigneeMember = caregivers.find((c) => c.id === newAssigneeId);
      const explanationText = assigneeMember
        ? explainWithRules({
            assigneeName: assigneeMember.name,
            assigneeLocalTime: localTime(assigneeMember, now).toFormat("HH:mm"),
            targetLanguage: assigneeMember.language,
            loadVisible: allConsented,
            reasonCodes: routeRes.reasonCodes,
            isBackup: routeRes.status === "backup",
          })
        : "No eligible caregiver available at this time.";

      const updatedHandoff = {
        ...handoff,
        status: newStatus,
        assigneeId: newAssigneeId,
        skippedIds,
        attempts: nextAttempts,
        ackDeadline: newAckDeadline,
        explanation: {
          language: assigneeMember?.language ?? "en",
          text: explanationText,
        },
        reasonCodes: routeRes.reasonCodes,
        history: [
          ...handoff.history,
          {
            at: now,
            actorId: "system",
            action: "rerouted",
            details: `Escalated from ${handoff.assigneeId ?? "unassigned"} to ${newAssigneeId ?? "unassigned"} (${act.reason})`,
          },
        ],
        version: handoff.version + 1,
      };

      ops.push({ type: "update_handoff", handoff: updatedHandoff });
    }
  }

  if (ops.length > 0) {
    const res = await storage.transact(ops, household.version);
    return { changed: true, version: res.version };
  }

  return { changed: false };
}
