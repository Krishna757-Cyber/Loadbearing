import { z } from "zod";

// ─── Nanoid-prefixed ID helpers ────────────────────────────────────────────
export const MemberIdSchema = z.string().regex(/^m_[a-zA-Z0-9_-]{6,}$/, "Invalid member id");
export const MomentIdSchema = z.string().regex(/^mo_[a-zA-Z0-9_-]{6,}$/, "Invalid moment id");
export const HandoffIdSchema = z.string().regex(/^h_[a-zA-Z0-9_-]{6,}$/, "Invalid handoff id");
export const LoadEntryIdSchema = z.string().regex(/^le_[a-zA-Z0-9_-]{6,}$/, "Invalid load entry id");
export const PrefIdSchema = z.string().regex(/^pref_[a-zA-Z0-9_-]{6,}$/, "Invalid preference id");
export const ProposalIdSchema = z.string().regex(/^prop_[a-zA-Z0-9_-]{6,}$/, "Invalid proposal id");
export const AuditIdSchema = z.string().regex(/^au_[a-zA-Z0-9_-]{6,}$/, "Invalid audit id");

// UTC ISO timestamp
export const IsoTimestampSchema = z.string().datetime({ offset: false });

// ─── Member ────────────────────────────────────────────────────────────────
export const MemberRoleSchema = z.enum(["recipient", "caregiver"]);
export const LanguageSchema = z.enum(["en", "hi"]);
export type Language = z.infer<typeof LanguageSchema>;

export const MemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  role: MemberRoleSchema,
  city: z.string().min(1).max(100),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  timeZone: z.string().min(1), // IANA zone
  language: LanguageSchema,
  awakeStart: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
  awakeEnd: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
  isLocal: z.boolean(),
  isBackup: z.boolean(),
  consentShare: z.boolean(),
});
export type Member = z.infer<typeof MemberSchema>;

// ─── Classification ────────────────────────────────────────────────────────
export const MomentKindSchema = z.enum(["care_task", "memory", "info"]);
export type MomentKind = z.infer<typeof MomentKindSchema>;
export const LoadKindSchema = z.enum(["doing", "planning", "emotional"]);
export type LoadKind = z.infer<typeof LoadKindSchema>;
export const UrgencySchema = z.enum(["calm", "soon", "urgent_not_emergency"]);
export type Urgency = z.infer<typeof UrgencySchema>;

export const ClassificationSchema = z.object({
  kind: MomentKindSchema,
  loadKind: LoadKindSchema.nullable(),
  urgency: UrgencySchema,
  needsLocalPresence: z.boolean(),
  summary: z.string().max(200),
  sensitive: z.boolean(),
  emergency: z.boolean().default(false),
});
export type Classification = z.infer<typeof ClassificationSchema>;

export const CreditSchema = z.object({
  label: z.string().max(200),
  loadKind: LoadKindSchema,
  evidence: z.string().max(600),
});
export type Credit = z.infer<typeof CreditSchema>;

// ─── Moment ────────────────────────────────────────────────────────────────
export const MomentSourceSchema = z.enum(["voice", "doorstep", "manual"]);
export const MomentPrivacySchema = z.enum(["private", "shared", "household"]);
export const AiSourceSchema = z.enum(["bedrock", "rules"]);

export const MomentSchema = z.object({
  id: z.string().min(1),
  source: MomentSourceSchema,
  text: z.string().min(1).max(600),
  capturedBy: z.string().min(1), // member id or "system"
  capturedAt: IsoTimestampSchema,
  classification: ClassificationSchema,
  credits: z.array(CreditSchema),
  privacy: MomentPrivacySchema,
  sharedWith: z.array(z.string()),
  duplicateOf: z.string().nullable(),
  expiresAt: IsoTimestampSchema.nullable(),
  aiSource: AiSourceSchema,
  version: z.number().int().min(0),
});
export type Moment = z.infer<typeof MomentSchema>;

// ─── AuditEntry ────────────────────────────────────────────────────────────
export const AuditEntrySchema = z.object({
  at: IsoTimestampSchema,
  actorId: z.string().min(1),
  action: z.string().min(1).max(100),
  details: z.string().max(500).optional(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

// ─── Handoff ───────────────────────────────────────────────────────────────
export const HandoffTypeSchema = z.enum(["task", "memory"]);
export const HandoffStatusSchema = z.enum([
  "awaiting_acceptance",
  "accepted",
  "resolved",
  "unassigned",
  "shared",
]);

export const HandoffSchema = z.object({
  id: z.string().min(1),
  momentId: z.string().min(1),
  type: HandoffTypeSchema,
  status: HandoffStatusSchema,
  assigneeId: z.string().nullable(),
  skippedIds: z.array(z.string()),
  attempts: z.number().int().min(0),
  ackDeadline: IsoTimestampSchema.nullable(),
  explanation: z.object({
    language: LanguageSchema,
    text: z.string().max(500),
  }),
  reasonCodes: z.array(z.string()),
  history: z.array(AuditEntrySchema),
  createdAt: IsoTimestampSchema,
  version: z.number().int().min(0),
});
export type Handoff = z.infer<typeof HandoffSchema>;

// ─── LoadEntry ─────────────────────────────────────────────────────────────
export const LoadEntrySchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  kind: LoadKindSchema,
  label: z.string().max(300),
  baseWeight: z.number().min(0),
  performedAt: IsoTimestampSchema,
  inSleepWindow: z.boolean(),
  multiplier: z.union([z.literal(1), z.literal(2)]),
  effectiveWeight: z.number().min(0),
  momentId: z.string().nullable(),
  handoffId: z.string().nullable(),
});
export type LoadEntry = z.infer<typeof LoadEntrySchema>;

// ─── RoutingPreference ─────────────────────────────────────────────────────
export const RoutingPreferenceSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  kind: LoadKindSchema,
  remaining: z.number().int().min(0),
  expiresAt: IsoTimestampSchema,
});
export type RoutingPreference = z.infer<typeof RoutingPreferenceSchema>;

// ─── Proposal ──────────────────────────────────────────────────────────────
export const ShareRecordSchema = z.object({
  memberId: z.string().min(1),
  share: z.number().min(0).max(100),
});

export const MoveRecordSchema = z.object({
  toMemberId: z.string().min(1),
  kind: LoadKindSchema,
  count: z.number().int().min(1),
});

export const ProposalStatusSchema = z.enum(["proposed", "approved", "expired"]);

export const ProposalSchema = z.object({
  id: z.string().min(1),
  createdAt: IsoTimestampSchema,
  expiresAt: IsoTimestampSchema,
  windowDays: z.number().int().min(1).max(14),
  before: z.array(ShareRecordSchema),
  after: z.array(ShareRecordSchema),
  moves: z.array(MoveRecordSchema),
  rationale: z.string().max(400),
  status: ProposalStatusSchema,
  approvedBy: z.string().nullable(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

// ─── Household Clock ───────────────────────────────────────────────────────
export const ClockSchema = z.object({
  anchorSimMs: z.number().int(),   // simulated time at anchor
  anchorRealMs: z.number().int(),  // real wall time at anchor
  speed: z.number().min(0),       // playback multiplier
  paused: z.boolean(),
});
export type Clock = z.infer<typeof ClockSchema>;

// ─── Household ─────────────────────────────────────────────────────────────
export const HouseholdSchema = z.object({
  id: z.literal("demo"),
  members: z.array(MemberSchema),
  clock: ClockSchema,
  version: z.number().int().min(0),
});
export type Household = z.infer<typeof HouseholdSchema>;

// ─── Error Envelope ────────────────────────────────────────────────────────
export const ErrorCodeSchema = z.enum([
  "VALIDATION",
  "NOT_FOUND",
  "FORBIDDEN",
  "CONFLICT",
  "RATE_LIMITED",
  "AI_UNAVAILABLE",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    fix: z.string().optional(),
    requestId: z.string().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

export function makeError(
  code: ErrorCode,
  message: string,
  fix?: string,
  requestId?: string
): ErrorEnvelope {
  return { ok: false, error: { code, message, fix, requestId } };
}
