/**
 * In-process deterministic tool execution fallback for Next.js on Vercel
 * when the external MCP server daemon (port 8787) is not running.
 * Implements the exact same rules-based logic and output structures.
 */

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
}

const EMERGENCY_PATTERNS = [
  /\bfall\b/i,
  /\bfallen\b/i,
  /\bgir\s+gaya\b/i,
  /\bgir\s+gayi\b/i,
  /\bgire\b/i,
  /\bchest\s+pain\b/i,
  /\bseene\s+mein\s+dard\b/i,
  /\bchhati\s+mein\s+dard\b/i,
  /\bunconscious\b/i,
  /\bbehosh\b/i,
  /\bbehoshi\b/i,
  /\bcannot\s+breathe\b/i,
  /\bcan't\s+breathe\b/i,
  /\bsaans\b/i,
  /\bsaas\s+nahi\b/i,
  /\bbleeding\b/i,
  /\bkhoon\b/i,
  /\brakt\b/i,
];

function isEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((pat) => pat.test(text));
}

export function executeToolFallback(
  name: string,
  args: Record<string, unknown>
): ToolResult {
  const now = new Date().toISOString();

  switch (name) {
    case "capture_moment": {
      const text = String(args.text || "").trim();
      const capturedBy = String(args.captured_by || "priya");
      const lang = String(args.language || "en");
      const source = String(args.source || "voice");
      const momentId = `mo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      if (isEmergency(text)) {
        const structured = {
          moment_id: momentId,
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
          duplicate_of: null,
          next: "emergency_card",
          ai_source: "rules",
          message:
            lang === "hi"
              ? "आपातकालीन स्थिति का पता चला। यदि दादी खतरे में हैं तो तुरंत आपातकालीन सेवाओं को कॉल करें।"
              : "Critical health indicator detected. Please call emergency services immediately if Dadi is in danger.",
        };
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      const lower = text.toLowerCase();

      // Doorstep event handling
      if (source === "doorstep" || capturedBy === "system") {
        if (lower.includes("newspaper") || lower.includes("courier") || lower.includes("letters") || lower.includes("mail")) {
          const structured = {
            moment_id: momentId,
            classification: {
              kind: "info",
              loadKind: null,
              urgency: "calm",
              needsLocalPresence: false,
              summary: "Regular postal courier dropped daily mail",
              sensitive: false,
              emergency: false,
            },
            credits: [],
            duplicate_of: null,
            next: "logged_only",
            ai_source: "rules",
            message: "Regular postal courier delivery logged as info.",
          };
          return {
            content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
            structuredContent: structured,
          };
        }

        const isDelivery = lower.includes("delivery") || lower.includes("box") || lower.includes("porch");
        const summary = isDelivery ? "Bring in delivery box from front porch" : "Late evening doorstep check-in";
        const structured = {
          moment_id: momentId,
          classification: {
            kind: "care_task",
            loadKind: "doing",
            urgency: "urgent_not_emergency",
            needsLocalPresence: true,
            summary,
            sensitive: false,
            emergency: false,
          },
          credits: [],
          duplicate_of: null,
          next: "ask_consent",
          ai_source: "rules",
          message: isDelivery
            ? "A delivery box was left at Dadi's front porch. Assigning someone to check it."
            : "An unexpected visitor is knocking at Dadi's front door. Assigning someone to check in.",
        };
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      const isMemory =
        lower.includes("kheer") ||
        lower.includes("recipe") ||
        lower.includes("memory") ||
        lower.includes("yaad") ||
        lower.includes("childhood") ||
        lower.includes("purani");

      if (isMemory) {
        const structured = {
          moment_id: momentId,
          classification: {
            kind: "memory",
            loadKind: null,
            urgency: "calm",
            needsLocalPresence: false,
            summary: lang === "hi" ? "दादी की पुरानी खीर की रेसिपी" : "Dadi's traditional kheer recipe",
            sensitive: false,
            emergency: false,
          },
          credits: [],
          duplicate_of: null,
          next: "ask_consent",
          ai_source: "rules",
          message:
            lang === "hi"
              ? "दादी की खीर की रेसिपी सहेजी गई। क्या आप इसे अर्जुन और मीरा के साथ साझा करना चाहते हैं?"
              : "Cherished memory captured! Share this warmth with Arjun and Meera?",
        };
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      // Check for past work credit (e.g. researched clinics, booked physiotherapy)
      const hasResearch = lower.includes("researched") || lower.includes("booked") || lower.includes("ordered") || lower.includes("paid");
      const credits = [];
      if (hasResearch) {
        credits.push({
          id: `cr_${Date.now().toString(36)}`,
          caregiverId: capturedBy,
          kind: "planning",
          units: 2,
          label: "Researched clinics & booked physiotherapy",
          createdAt: now,
        });
      }

      const needsTransport = lower.includes("transport") || lower.includes("drive") || lower.includes("ride");
      const summary = needsTransport
        ? "Transport for Dadi's Friday physiotherapy"
        : text.slice(0, 100);

      const structured = {
        moment_id: momentId,
        classification: {
          kind: "care_task",
          loadKind: needsTransport ? "doing" : "planning",
          urgency: "urgent_not_emergency",
          needsLocalPresence: needsTransport,
          summary,
          sensitive: lower.includes("clinic") || lower.includes("doctor") || lower.includes("physio") || lower.includes("tired"),
          emergency: false,
        },
        credits,
        duplicate_of: null,
        next: "ask_consent",
        ai_source: "rules",
        message:
          credits.length > 0
            ? "I credited your research and booking. Care task is open for Friday transport. Share this with Arjun and Meera?"
            : "Moment captured and classified. Would you like to share this task with your fellow caregivers?",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
        structuredContent: structured,
      };
    }

    case "create_handoff": {
      const momentId = String(args.moment_id || "");
      const actorId = String(args.actor_id || "priya");
      const handoffId = `ho_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      // Deterministic follow-the-sun routing:
      // If actor is system (doorstep event), route to Meera (Toronto) as per demo UI spec
      // If actor is Priya (Pune, IST), route to Arjun (Berlin, awake afternoon)
      let assigneeId = "arjun";
      if (actorId === "system") {
        assigneeId = "meera";
      } else if (actorId === "arjun") {
        assigneeId = "meera";
      } else {
        assigneeId = "arjun";
      }

      const assigneeCity = assigneeId === "arjun" ? "Berlin" : (assigneeId === "meera" ? "Toronto" : "Pune");
      const localTimeStr = assigneeId === "arjun" ? "18:30" : (assigneeId === "meera" ? "12:30" : "22:00");

      const structured = {
        handoff_id: handoffId,
        moment_id: momentId,
        status: "awaiting_acceptance",
        assignee_id: assigneeId,
        explanation: `${assigneeId.charAt(0).toUpperCase() + assigneeId.slice(1)} is awake in ${assigneeCity} (${localTimeStr} local) with the lowest current load share. Task routed to ${assigneeId.charAt(0).toUpperCase() + assigneeId.slice(1)}.`,
        ack_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        ai_source: "rules",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
        structuredContent: structured,
      };
    }

    case "record_resolution": {
      const handoffId = String(args.handoff_id || "ho_default");
      const outcome = String(args.outcome || "accepted");
      const actorId = String(args.actor_id || "arjun");

      const structured = {
        handoff_id: handoffId,
        status: outcome,
        assignee_id: actorId,
        message: `Handoff ${outcome} successfully.`,
        shares: {
          priya: 0.38,
          arjun: 0.34,
          meera: 0.28,
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
        structuredContent: structured,
      };
    }

    case "get_continuity_brief": {
      const memberId = String(args.member_id || "priya");
      const lang = String(args.language || "en");
      const memberName = memberId.charAt(0).toUpperCase() + memberId.slice(1);

      const stats = {
        resolved: 2,
        open: 1,
        memories_shared: 1,
        unowned: 0,
      };

      const briefText =
        lang === "hi"
          ? `नमस्ते ${memberName}, पिछले 24 घंटों में परिवार ने 2 कार्यों को पूरा किया है और 1 नई याद साझा की है। वर्तमान में 1 कार्य प्रगति पर है। कोई भी ज़िम्मेदारी बिना देखरेख के नहीं छूटी।`
          : `Hello ${memberName}, in the past 24 hours the family resolved 2 care tasks and shared 1 family memory. There is 1 open active task. No responsibility was left unowned.`;

      const structured = {
        text: briefText,
        stats,
        ai_source: "rules",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
        structuredContent: structured,
      };
    }

    case "propose_rebalance": {
      const approveId = args.approve_proposal_id ? String(args.approve_proposal_id) : null;

      if (approveId) {
        const structured = {
          status: "approved",
          proposal_id: approveId,
          message: "Rebalance proposal approved. Care tasks updated.",
        };
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      const proposalId = `prop_${Date.now().toString(36)}`;
      const structured = {
        proposal_id: proposalId,
        createdAt: now,
        status: "proposed",
        requires_approval: true,
        windowDays: 7,
        before: { priya: 0.58, arjun: 0.24, meera: 0.18 },
        after: { priya: 0.36, arjun: 0.34, meera: 0.30 },
        moves: [
          {
            taskId: "task_transport",
            fromId: "priya",
            toId: "arjun",
            label: "Coordinate Friday physiotherapy transport",
          },
        ],
        rationale:
          "Rebalancing shifts transport coordination to Arjun during his awake window in Berlin to relieve Priya's high load.",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
        structuredContent: structured,
      };
    }

    default:
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true }) }],
        structuredContent: { ok: true },
      };
  }
}
