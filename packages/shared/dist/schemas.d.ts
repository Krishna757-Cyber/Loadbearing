import { z } from "zod";
export declare const MemberIdSchema: z.ZodString;
export declare const MomentIdSchema: z.ZodString;
export declare const HandoffIdSchema: z.ZodString;
export declare const LoadEntryIdSchema: z.ZodString;
export declare const PrefIdSchema: z.ZodString;
export declare const ProposalIdSchema: z.ZodString;
export declare const AuditIdSchema: z.ZodString;
export declare const IsoTimestampSchema: z.ZodString;
export declare const MemberRoleSchema: z.ZodEnum<{
    recipient: "recipient";
    caregiver: "caregiver";
}>;
export declare const LanguageSchema: z.ZodEnum<{
    en: "en";
    hi: "hi";
}>;
export type Language = z.infer<typeof LanguageSchema>;
export declare const MemberSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<{
        recipient: "recipient";
        caregiver: "caregiver";
    }>;
    city: z.ZodString;
    lat: z.ZodNumber;
    lon: z.ZodNumber;
    timeZone: z.ZodString;
    language: z.ZodEnum<{
        en: "en";
        hi: "hi";
    }>;
    awakeStart: z.ZodString;
    awakeEnd: z.ZodString;
    isLocal: z.ZodBoolean;
    isBackup: z.ZodBoolean;
    consentShare: z.ZodBoolean;
}, z.core.$strip>;
export type Member = z.infer<typeof MemberSchema>;
export declare const MomentKindSchema: z.ZodEnum<{
    care_task: "care_task";
    memory: "memory";
    info: "info";
}>;
export type MomentKind = z.infer<typeof MomentKindSchema>;
export declare const LoadKindSchema: z.ZodEnum<{
    doing: "doing";
    planning: "planning";
    emotional: "emotional";
}>;
export type LoadKind = z.infer<typeof LoadKindSchema>;
export declare const UrgencySchema: z.ZodEnum<{
    calm: "calm";
    soon: "soon";
    urgent_not_emergency: "urgent_not_emergency";
}>;
export type Urgency = z.infer<typeof UrgencySchema>;
export declare const ClassificationSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        care_task: "care_task";
        memory: "memory";
        info: "info";
    }>;
    loadKind: z.ZodNullable<z.ZodEnum<{
        doing: "doing";
        planning: "planning";
        emotional: "emotional";
    }>>;
    urgency: z.ZodEnum<{
        calm: "calm";
        soon: "soon";
        urgent_not_emergency: "urgent_not_emergency";
    }>;
    needsLocalPresence: z.ZodBoolean;
    summary: z.ZodString;
    sensitive: z.ZodBoolean;
    emergency: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type Classification = z.infer<typeof ClassificationSchema>;
export declare const CreditSchema: z.ZodObject<{
    label: z.ZodString;
    loadKind: z.ZodEnum<{
        doing: "doing";
        planning: "planning";
        emotional: "emotional";
    }>;
    evidence: z.ZodString;
}, z.core.$strip>;
export type Credit = z.infer<typeof CreditSchema>;
export declare const MomentSourceSchema: z.ZodEnum<{
    voice: "voice";
    doorstep: "doorstep";
    manual: "manual";
}>;
export declare const MomentPrivacySchema: z.ZodEnum<{
    private: "private";
    shared: "shared";
    household: "household";
}>;
export declare const AiSourceSchema: z.ZodEnum<{
    bedrock: "bedrock";
    rules: "rules";
}>;
export declare const MomentSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodEnum<{
        voice: "voice";
        doorstep: "doorstep";
        manual: "manual";
    }>;
    text: z.ZodString;
    capturedBy: z.ZodString;
    capturedAt: z.ZodString;
    classification: z.ZodObject<{
        kind: z.ZodEnum<{
            care_task: "care_task";
            memory: "memory";
            info: "info";
        }>;
        loadKind: z.ZodNullable<z.ZodEnum<{
            doing: "doing";
            planning: "planning";
            emotional: "emotional";
        }>>;
        urgency: z.ZodEnum<{
            calm: "calm";
            soon: "soon";
            urgent_not_emergency: "urgent_not_emergency";
        }>;
        needsLocalPresence: z.ZodBoolean;
        summary: z.ZodString;
        sensitive: z.ZodBoolean;
        emergency: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    credits: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        loadKind: z.ZodEnum<{
            doing: "doing";
            planning: "planning";
            emotional: "emotional";
        }>;
        evidence: z.ZodString;
    }, z.core.$strip>>;
    privacy: z.ZodEnum<{
        private: "private";
        shared: "shared";
        household: "household";
    }>;
    sharedWith: z.ZodArray<z.ZodString>;
    duplicateOf: z.ZodNullable<z.ZodString>;
    expiresAt: z.ZodNullable<z.ZodString>;
    aiSource: z.ZodEnum<{
        bedrock: "bedrock";
        rules: "rules";
    }>;
    version: z.ZodNumber;
}, z.core.$strip>;
export type Moment = z.infer<typeof MomentSchema>;
export declare const AuditEntrySchema: z.ZodObject<{
    at: z.ZodString;
    actorId: z.ZodString;
    action: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
export declare const HandoffTypeSchema: z.ZodEnum<{
    memory: "memory";
    task: "task";
}>;
export declare const HandoffStatusSchema: z.ZodEnum<{
    shared: "shared";
    awaiting_acceptance: "awaiting_acceptance";
    accepted: "accepted";
    resolved: "resolved";
    unassigned: "unassigned";
}>;
export declare const HandoffSchema: z.ZodObject<{
    id: z.ZodString;
    momentId: z.ZodString;
    type: z.ZodEnum<{
        memory: "memory";
        task: "task";
    }>;
    status: z.ZodEnum<{
        shared: "shared";
        awaiting_acceptance: "awaiting_acceptance";
        accepted: "accepted";
        resolved: "resolved";
        unassigned: "unassigned";
    }>;
    assigneeId: z.ZodNullable<z.ZodString>;
    skippedIds: z.ZodArray<z.ZodString>;
    attempts: z.ZodNumber;
    ackDeadline: z.ZodNullable<z.ZodString>;
    explanation: z.ZodObject<{
        language: z.ZodEnum<{
            en: "en";
            hi: "hi";
        }>;
        text: z.ZodString;
    }, z.core.$strip>;
    reasonCodes: z.ZodArray<z.ZodString>;
    history: z.ZodArray<z.ZodObject<{
        at: z.ZodString;
        actorId: z.ZodString;
        action: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    createdAt: z.ZodString;
    version: z.ZodNumber;
}, z.core.$strip>;
export type Handoff = z.infer<typeof HandoffSchema>;
export declare const LoadEntrySchema: z.ZodObject<{
    id: z.ZodString;
    memberId: z.ZodString;
    kind: z.ZodEnum<{
        doing: "doing";
        planning: "planning";
        emotional: "emotional";
    }>;
    label: z.ZodString;
    baseWeight: z.ZodNumber;
    performedAt: z.ZodString;
    inSleepWindow: z.ZodBoolean;
    multiplier: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>]>;
    effectiveWeight: z.ZodNumber;
    momentId: z.ZodNullable<z.ZodString>;
    handoffId: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type LoadEntry = z.infer<typeof LoadEntrySchema>;
export declare const RoutingPreferenceSchema: z.ZodObject<{
    id: z.ZodString;
    memberId: z.ZodString;
    kind: z.ZodEnum<{
        doing: "doing";
        planning: "planning";
        emotional: "emotional";
    }>;
    remaining: z.ZodNumber;
    expiresAt: z.ZodString;
}, z.core.$strip>;
export type RoutingPreference = z.infer<typeof RoutingPreferenceSchema>;
export declare const ShareRecordSchema: z.ZodObject<{
    memberId: z.ZodString;
    share: z.ZodNumber;
}, z.core.$strip>;
export declare const MoveRecordSchema: z.ZodObject<{
    toMemberId: z.ZodString;
    kind: z.ZodEnum<{
        doing: "doing";
        planning: "planning";
        emotional: "emotional";
    }>;
    count: z.ZodNumber;
}, z.core.$strip>;
export declare const ProposalStatusSchema: z.ZodEnum<{
    proposed: "proposed";
    approved: "approved";
    expired: "expired";
}>;
export declare const ProposalSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    expiresAt: z.ZodString;
    windowDays: z.ZodNumber;
    before: z.ZodArray<z.ZodObject<{
        memberId: z.ZodString;
        share: z.ZodNumber;
    }, z.core.$strip>>;
    after: z.ZodArray<z.ZodObject<{
        memberId: z.ZodString;
        share: z.ZodNumber;
    }, z.core.$strip>>;
    moves: z.ZodArray<z.ZodObject<{
        toMemberId: z.ZodString;
        kind: z.ZodEnum<{
            doing: "doing";
            planning: "planning";
            emotional: "emotional";
        }>;
        count: z.ZodNumber;
    }, z.core.$strip>>;
    rationale: z.ZodString;
    status: z.ZodEnum<{
        proposed: "proposed";
        approved: "approved";
        expired: "expired";
    }>;
    approvedBy: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type Proposal = z.infer<typeof ProposalSchema>;
export declare const ClockSchema: z.ZodObject<{
    anchorSimMs: z.ZodNumber;
    anchorRealMs: z.ZodNumber;
    speed: z.ZodNumber;
    paused: z.ZodBoolean;
}, z.core.$strip>;
export type Clock = z.infer<typeof ClockSchema>;
export declare const HouseholdSchema: z.ZodObject<{
    id: z.ZodLiteral<"demo">;
    members: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        role: z.ZodEnum<{
            recipient: "recipient";
            caregiver: "caregiver";
        }>;
        city: z.ZodString;
        lat: z.ZodNumber;
        lon: z.ZodNumber;
        timeZone: z.ZodString;
        language: z.ZodEnum<{
            en: "en";
            hi: "hi";
        }>;
        awakeStart: z.ZodString;
        awakeEnd: z.ZodString;
        isLocal: z.ZodBoolean;
        isBackup: z.ZodBoolean;
        consentShare: z.ZodBoolean;
    }, z.core.$strip>>;
    clock: z.ZodObject<{
        anchorSimMs: z.ZodNumber;
        anchorRealMs: z.ZodNumber;
        speed: z.ZodNumber;
        paused: z.ZodBoolean;
    }, z.core.$strip>;
    version: z.ZodNumber;
}, z.core.$strip>;
export type Household = z.infer<typeof HouseholdSchema>;
export declare const ErrorCodeSchema: z.ZodEnum<{
    VALIDATION: "VALIDATION";
    NOT_FOUND: "NOT_FOUND";
    FORBIDDEN: "FORBIDDEN";
    CONFLICT: "CONFLICT";
    RATE_LIMITED: "RATE_LIMITED";
    AI_UNAVAILABLE: "AI_UNAVAILABLE";
    INTERNAL: "INTERNAL";
}>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export declare const ErrorEnvelopeSchema: z.ZodObject<{
    ok: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodEnum<{
            VALIDATION: "VALIDATION";
            NOT_FOUND: "NOT_FOUND";
            FORBIDDEN: "FORBIDDEN";
            CONFLICT: "CONFLICT";
            RATE_LIMITED: "RATE_LIMITED";
            AI_UNAVAILABLE: "AI_UNAVAILABLE";
            INTERNAL: "INTERNAL";
        }>;
        message: z.ZodString;
        fix: z.ZodOptional<z.ZodString>;
        requestId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export declare function makeError(code: ErrorCode, message: string, fix?: string, requestId?: string): ErrorEnvelope;
//# sourceMappingURL=schemas.d.ts.map