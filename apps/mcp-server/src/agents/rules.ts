import type {
  Classification,
  Credit,
  Language,
  LoadKind,
  MomentKind,
  Urgency,
} from "@loadbearing/shared";

// ─── Emergency Lexicon (Deterministic — never bypassable) ───────────────────
export const EMERGENCY_PATTERNS = [
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

export function checkEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((pat) => pat.test(text));
}

// ─── Rules-based Classifier ────────────────────────────────────────────────
export function classifyWithRules(text: string): {
  classification: Classification;
  credits: Credit[];
} {
  const isEmergency = checkEmergency(text);
  if (isEmergency) {
    return {
      classification: {
        kind: "care_task",
        loadKind: "doing",
        urgency: "urgent_not_emergency", // internal code is urgent_not_emergency, but emergency flag is true
        needsLocalPresence: true,
        summary: "Emergency event detected from voice/text input",
        sensitive: true,
        emergency: true,
      },
      credits: [],
    };
  }

  const lower = text.toLowerCase();

  // Kind determination
  let kind: MomentKind = "care_task";
  if (
    lower.includes("remember") ||
    lower.includes("memory") ||
    lower.includes("nostalgic") ||
    lower.includes("story") ||
    lower.includes("stories") ||
    lower.includes("kheer") ||
    lower.includes("childhood") ||
    lower.includes("old days") ||
    lower.includes("yaad")
  ) {
    kind = "memory";
  } else if (
    lower.startsWith("note:") ||
    lower.startsWith("fyi:") ||
    lower.includes("just letting you know") ||
    lower.includes("for info")
  ) {
    kind = "info";
  }

  // LoadKind determination
  let loadKind: LoadKind | null = null;
  if (kind === "care_task") {
    if (
      lower.includes("research") ||
      lower.includes("look into") ||
      lower.includes("book") ||
      lower.includes("schedule") ||
      lower.includes("coordinate") ||
      lower.includes("find") ||
      lower.includes("plan")
    ) {
      loadKind = "planning";
    } else if (
      lower.includes("call") ||
      lower.includes("check in") ||
      lower.includes("comfort") ||
      lower.includes("talk to") ||
      lower.includes("tea and") ||
      lower.includes("moral support") ||
      lower.includes("emotional")
    ) {
      loadKind = "emotional";
    } else {
      loadKind = "doing";
    }
  }

  // Urgency
  let urgency: Urgency = "calm";
  if (
    lower.includes("asap") ||
    lower.includes("urgent") ||
    lower.includes("immediately") ||
    lower.includes("right now")
  ) {
    urgency = "urgent_not_emergency";
  } else if (
    lower.includes("soon") ||
    lower.includes("today") ||
    lower.includes("tomorrow")
  ) {
    urgency = "soon";
  }

  // Needs local presence
  const needsLocalPresence =
    lower.includes("doorstep") ||
    lower.includes("at the door") ||
    lower.includes("visitor") ||
    lower.includes("delivery") ||
    lower.includes("in person") ||
    lower.includes("physically") ||
    lower.includes("at her apartment") ||
    lower.includes("at dadi's place");

  // Sensitive
  const sensitive =
    lower.includes("doctor") ||
    lower.includes("clinic") ||
    lower.includes("hospital") ||
    lower.includes("medicine") ||
    lower.includes("prescription") ||
    lower.includes("physiotherapy") ||
    lower.includes("utility bill") ||
    lower.includes("money") ||
    lower.includes("bank") ||
    lower.includes("financial") ||
    lower.includes("health");

  // Credits for past work already done
  const credits: Credit[] = [];

  // Specifically detect coordinated actions (e.g. "I researched clinics and booked Dadi's physiotherapy")
  const pastActionVerbs = ["researched", "booked", "ordered", "paid", "called", "coordinated", "checked", "updated"];
  const pastActionRegex = new RegExp(`\\b(${pastActionVerbs.join("|")})\\s+([^,.;!?]+?)(?=\\s+and\\s+|\\s+but\\s+|,|\\.|;|!|\\?|$)`, "gi");

  let match: RegExpExecArray | null;
  // If text starts with past action claim like "I researched..."
  if (/\bI\s+(?:have\s+)?(?:researched|booked|ordered|paid|called|coordinated|checked|updated)\b/i.test(text)) {
    while ((match = pastActionRegex.exec(text)) !== null) {
      const verb = match[1]!.toLowerCase();
      const obj = match[2]!.trim();
      const phrase = `${match[1]} ${obj}`.trim();
      if (text.includes(phrase) && phrase.length > 5) {
        const itemKind: LoadKind = ["researched", "booked", "coordinated"].includes(verb) ? "planning" : "doing";
        credits.push({
          label: phrase,
          loadKind: itemKind,
          evidence: phrase,
        });
      }
    }
  }

  // Fallback single match if specific pattern didn't yield multiple
  if (credits.length === 0) {
    const singleMatch = /\b(I\s+(?:have\s+)?(?:ordered|booked|paid|called|researched|coordinated|checked|updated)[^.!?]+)/i.exec(text);
    if (singleMatch?.[1]) {
      const evidence = singleMatch[1].trim();
      if (text.includes(evidence)) {
        credits.push({
          label: evidence,
          loadKind: loadKind ?? "doing",
          evidence,
        });
      }
    }
  }

  // Neutral summary
  let summary = text.slice(0, 160).trim();
  if (summary.length < text.length) summary += "...";

  return {
    classification: {
      kind,
      loadKind,
      urgency,
      needsLocalPresence,
      summary,
      sensitive,
      emergency: false,
    },
    credits,
  };
}

// ─── Rules-based Explainer ─────────────────────────────────────────────────
export interface ExplainOptions {
  assigneeName: string;
  assigneeLocalTime: string;
  targetLanguage: Language;
  loadVisible: boolean;
  reasonCodes: string[];
  isBackup?: boolean;
}

export function explainWithRules(options: ExplainOptions): string {
  const { assigneeName, assigneeLocalTime, targetLanguage, loadVisible, isBackup } = options;

  if (targetLanguage === "hi") {
    if (isBackup) {
      return `${assigneeName} बैकअप संपर्क के रूप में उपलब्ध हैं (स्थानीय समय ${assigneeLocalTime})।`;
    }
    if (loadVisible) {
      return `${assigneeName} अभी जग रहे हैं (${assigneeLocalTime}) और उनका कार्यभार सबसे कम है।`;
    }
    return `${assigneeName} अभी जग रहे हैं और उपलब्ध हैं (${assigneeLocalTime} स्थानीय समय)।`;
  }

  // English
  if (isBackup) {
    return `${assigneeName} is available as backup contact (${assigneeLocalTime} local).`;
  }
  if (loadVisible) {
    return `${assigneeName} is awake (${assigneeLocalTime} local) with the lowest current load share.`;
  }
  return `${assigneeName} is awake and available (${assigneeLocalTime} local).`;
}

// ─── Rules-based Brief Writer ──────────────────────────────────────────────
export interface BriefOptions {
  memberName: string;
  language: Language;
  stats: {
    resolved: number;
    open: number;
    memories_shared: number;
    unowned: number;
  };
  sampleTexts?: string[];
}

export function writeBriefWithRules(options: BriefOptions): string {
  const { memberName, language, stats } = options;
  const unownedZero = stats.unowned === 0;

  if (language === "hi") {
    let brief = `नमस्ते ${memberName}, पिछले 24 घंटों में परिवार ने ${stats.resolved} कार्यों को पूरा किया है`;
    if (stats.memories_shared > 0) {
      brief += ` और ${stats.memories_shared} नई यादें साझा की हैं`;
    }
    brief += `। वर्तमान में ${stats.open} कार्य प्रगति पर हैं।`;
    if (unownedZero) {
      brief += " कोई भी ज़िम्मेदारी बिना देखरेख के नहीं छूटी।";
    }
    return brief;
  }

  // English
  let brief = `Hello ${memberName}, in the past 24 hours the family resolved ${stats.resolved} care tasks`;
  if (stats.memories_shared > 0) {
    brief += ` and shared ${stats.memories_shared} family memory`;
  }
  brief += `. There are ${stats.open} open active tasks.`;
  if (unownedZero) {
    brief += " No responsibility was left unowned.";
  }
  return brief;
}
