import type {
  AuditEntry,
  Handoff,
  Member,
  Moment,
} from "@loadbearing/shared";
import type { HouseholdState } from "./storage/types.js";
import { loadShares } from "followthesun-router";

export interface ViewableHandoff extends Omit<Handoff, "history"> {
  history: AuditEntry[];
}

export interface ViewableState {
  id: "demo";
  viewerId: string;
  viewerRole: "recipient" | "caregiver";
  members: (Member & { computedShare: number | null })[];
  moments: Moment[];
  handoffs: ViewableHandoff[];
  loadVisibleToViewer: boolean;
  allConsented: boolean;
  clock: HouseholdState["clock"];
  version: number;
}

export function areAllCaregiversConsented(members: Member[]): boolean {
  const caregivers = members.filter((m) => m.role === "caregiver");
  return caregivers.length > 0 && caregivers.every((c) => c.consentShare);
}

export function isMomentVisibleToViewer(
  moment: Moment,
  viewerId: string,
  viewerRole: "recipient" | "caregiver"
): boolean {
  // Recipient (Dadi) visibility rule:
  // "For the recipient: only shared memories and resolved non-sensitive tasks."
  if (viewerRole === "recipient") {
    if (moment.classification.sensitive) return false;
    if (moment.classification.kind === "memory") {
      return (
        moment.privacy === "shared" &&
        moment.sharedWith.includes(viewerId)
      );
    }
    // Care tasks must be shared and non-sensitive
    return (
      (moment.privacy === "shared" || moment.privacy === "household") &&
      moment.sharedWith.includes(viewerId)
    );
  }

  // Caregiver visibility rule:
  // "a moment is visible to its captor and to members in sharedWith (household moments: all caregivers); other private moments are hidden everywhere"
  if (moment.capturedBy === viewerId) return true;
  if (moment.privacy === "household") return true;
  if (moment.privacy === "shared" && moment.sharedWith.includes(viewerId)) {
    return true;
  }

  return false;
}

export function filterHouseholdForViewer(
  state: HouseholdState,
  viewerId: string,
  nowIso: string
): ViewableState {
  const viewer = state.members.find((m) => m.id === viewerId);
  const viewerRole = viewer?.role ?? "caregiver";

  const allConsented = areAllCaregiversConsented(state.members);
  const caregivers = state.members.filter((m) => m.role === "caregiver");
  const rawShares = loadShares(caregivers, state.loadEntries, nowIso);

  // Visible moments
  const visibleMoments = state.moments.filter((m) =>
    isMomentVisibleToViewer(m, viewerId, viewerRole)
  );
  const visibleMomentIds = new Set(visibleMoments.map((m) => m.id));

  // Visible handoffs
  const visibleHandoffs: ViewableHandoff[] = state.handoffs
    .filter((h) => {
      if (viewerRole === "recipient") {
        return visibleMomentIds.has(h.momentId) && h.status === "resolved";
      }
      return visibleMomentIds.has(h.momentId) || h.assigneeId === viewerId;
    })
    .map((h) => {
      // Audit trail redaction:
      // "other private moments are hidden everywhere, including audit entries ('a private note')"
      const redactedHistory = h.history.map((audit) => {
        if (!visibleMomentIds.has(h.momentId)) {
          return {
            ...audit,
            details: "a private note",
          };
        }
        return audit;
      });
      return {
        ...h,
        history: redactedHistory,
      };
    });

  // Load shares visibility:
  // "Load shares are visible to everyone only when every caregiver has consentShare = true;
  // otherwise a viewer sees only their own share and others are null."
  const membersWithShares = state.members.map((m) => {
    if (m.role !== "caregiver") {
      return { ...m, computedShare: null };
    }
    const share = rawShares.get(m.id) ?? 0;
    if (allConsented) {
      return { ...m, computedShare: share };
    }
    if (m.id === viewerId) {
      return { ...m, computedShare: share };
    }
    return { ...m, computedShare: null };
  });

  return {
    id: "demo",
    viewerId,
    viewerRole,
    members: membersWithShares,
    moments: visibleMoments,
    handoffs: visibleHandoffs,
    loadVisibleToViewer: allConsented || (viewerRole === "caregiver"),
    allConsented,
    clock: state.clock,
    version: state.version,
  };
}
