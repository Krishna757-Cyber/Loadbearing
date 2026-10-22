import type {
  Member,
  Moment,
  Handoff,
  LoadEntry,
  RoutingPreference,
  Proposal,
  AuditEntry,
  Clock,
} from "@loadbearing/shared";

export interface HouseholdState {
  id: "demo";
  members: Member[];
  moments: Moment[];
  handoffs: Handoff[];
  loadEntries: LoadEntry[];
  preferences: RoutingPreference[];
  proposals: Proposal[];
  clock: Clock;
  version: number;
}

export type StorageOp =
  | { type: "put_moment"; moment: Moment }
  | { type: "update_moment"; moment: Moment }
  | { type: "put_handoff"; handoff: Handoff }
  | { type: "update_handoff"; handoff: Handoff }
  | { type: "put_load_entry"; entry: LoadEntry }
  | { type: "put_preference"; preference: RoutingPreference }
  | { type: "update_preference"; preference: RoutingPreference }
  | { type: "delete_preference"; id: string }
  | { type: "put_proposal"; proposal: Proposal }
  | { type: "update_proposal"; proposal: Proposal }
  | { type: "update_clock"; clock: Clock }
  | { type: "update_member_consent"; memberId: string; consentShare: boolean }
  | { type: "add_audit"; audit: AuditEntry }
  | { type: "put_idempotency"; key: string; result: unknown; expiresAtMs: number }
  | { type: "reset_household"; state: HouseholdState };

export interface StorageAdapter {
  loadHousehold(): Promise<HouseholdState>;
  transact(ops: StorageOp[], expectedVersion: number): Promise<{ version: number }>;
  listAudit(): Promise<AuditEntry[]>;
  getIdempotency(key: string): Promise<unknown | null>;
}
