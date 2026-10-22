"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Volume2, Heart, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/store";

interface RebalanceProposalData {
  proposal_id?: string;
  visibility?: string;
  missing?: string[];
  rationale?: string;
  moves?: Array<{ toMemberId: string; kind: string; count: number }>;
}

export function BriefView() {
  const viewerId = useAppStore((s) => s.viewerId);
  const language = useAppStore((s) => s.language);
  const themeMode = useAppStore((s) => s.themeMode);
  const household = useAppStore((s) => s.household);
  const addToast = useAppStore((s) => s.addToast);

  const isLight = themeMode === "light";
  const [briefText, setBriefText] = useState<string | null>(null);
  const [stats, setStats] = useState<{ resolved: number; open: number; memories_shared: number; unowned: number } | null>(null);
  const [aiSource, setAiSource] = useState<"bedrock" | "rules" | null>(null);
  const [loading, setLoading] = useState(false);
  const [memoryInput, setMemoryInput] = useState("");
  const [submittingMemory, setSubmittingMemory] = useState(false);

  // Proposal state
  const [proposal, setProposal] = useState<RebalanceProposalData | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/get_continuity_brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: viewerId,
          language,
        }),
      });
      const data = await res.json();
      if (data.isError) {
        addToast("Failed to load continuity brief", "error");
      } else {
        const sc = data.structuredContent;
        if (sc) {
          setBriefText(sc.text);
          setStats(sc.stats);
          setAiSource(sc.ai_source ?? "rules");
        }
      }
    } catch {
      addToast("Network error loading brief", "error");
    } finally {
      setLoading(false);
    }
  }, [viewerId, language, addToast]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief, household?.version]);

  const speakBrief = () => {
    if (!briefText || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(briefText);
    utt.lang = language === "hi" ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(utt);
  };

  const handleShareMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryInput.trim() || submittingMemory) return;
    setSubmittingMemory(true);
    try {
      const res = await fetch("/api/tools/capture_moment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: memoryInput,
          source: "manual",
          captured_by: viewerId,
          language,
        }),
      });
      const data = await res.json();
      if (data.isError) {
        addToast("Failed to record memory", "error");
      } else {
        const momentId = data.structuredContent?.moment_id;
        if (momentId) {
          // Share memory with all caregivers
          await fetch("/api/tools/create_handoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              moment_id: momentId,
              actor_id: viewerId,
              share_with: ["priya", "arjun", "meera"].filter((id) => id !== viewerId),
            }),
          });
        }
        setMemoryInput("");
        addToast("Memory shared with family (purple star added to globe)", "success");
      }
    } catch {
      addToast("Error sharing memory", "error");
    } finally {
      setSubmittingMemory(false);
    }
  };

  const handleProposeRebalance = async () => {
    setProposalLoading(true);
    try {
      const res = await fetch("/api/tools/propose_rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ window_days: 7 }),
      });
      const data = await res.json();
      if (data.isError) {
        addToast(data.error?.message || "Could not propose rebalance", "error");
      } else {
        setProposal(data.structuredContent);
      }
    } catch {
      addToast("Network error requesting proposal", "error");
    } finally {
      setProposalLoading(false);
    }
  };

  const handleApproveProposal = async () => {
    if (!proposal?.proposal_id) return;
    try {
      const res = await fetch("/api/tools/propose_rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approve_proposal_id: proposal.proposal_id,
          approved_by: viewerId,
        }),
      });
      const data = await res.json();
      if (data.isError) {
        addToast(data.error?.message || "Failed to approve proposal", "error");
      } else {
        addToast("Rebalance approved! Routing preference created.", "success");
        setProposal(null);
      }
    } catch {
      addToast("Error approving proposal", "error");
    }
  };

  return (
    <div className="relative z-10 max-w-2xl mx-auto p-6 flex flex-col gap-6 text-xs select-none">
      {/* Brief Card */}
      <div
        className={`rounded-2xl p-6 shadow-2xl space-y-4 border transition-colors ${
          isLight
            ? "bg-white/98 backdrop-blur border-slate-200 text-slate-900"
            : "bg-[#262B52]/90 backdrop-blur border-[#3A4178] text-[#EDEAF6]"
        }`}
      >
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isLight ? "border-slate-200" : "border-[#3A4178]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#FF7A7A]" />
            <h2 className="font-display text-base font-semibold">
              {language === "hi" ? "दैनिक निरंतरता पत्र" : "Family Continuity Brief"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {briefText && (
              <button
                onClick={speakBrief}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-medium transition-colors ${
                  isLight
                    ? "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                    : "bg-[#14182B] border-[#3A4178] hover:border-[#FFC66B] text-[#FFC66B]"
                }`}
                title="Read brief aloud"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listen</span>
              </button>
            )}
            <button
              onClick={fetchBrief}
              disabled={loading}
              className={`p-1.5 rounded-lg border transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                  : "bg-[#14182B] border-[#3A4178] text-[#9AA3D6] hover:text-[#EDEAF6]"
              }`}
              title="Refresh brief"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-[#14182B]/60 border-[#3A4178]/60"
              }`}
            >
              <span className="block font-mono text-base font-bold text-[#10B981]">
                {stats.resolved}
              </span>
              <span className={`text-[10px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
                Resolved
              </span>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-[#14182B]/60 border-[#3A4178]/60"
              }`}
            >
              <span className="block font-mono text-base font-bold text-[#2563EB]">
                {stats.open}
              </span>
              <span className={`text-[10px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
                Open
              </span>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-[#14182B]/60 border-[#3A4178]/60"
              }`}
            >
              <span className="block font-mono text-base font-bold text-[#8B5CF6]">
                {stats.memories_shared}
              </span>
              <span className={`text-[10px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
                Memories
              </span>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-[#14182B]/60 border-[#3A4178]/60"
              }`}
            >
              <span className="block font-mono text-base font-bold text-[#D97706]">
                {stats.unowned}
              </span>
              <span className={`text-[10px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
                Unowned
              </span>
            </div>
          </div>
        )}

        {/* Letter body */}
        <div
          className={`p-4 rounded-xl border-l-2 leading-relaxed text-sm ${
            isLight
              ? "bg-slate-50 border-amber-500 text-slate-800"
              : "bg-[#14182B]/80 border-[#FFC66B] text-[#EDEAF6]"
          }`}
        >
          {loading ? (
            <p className={`animate-pulse ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
              Composing today&apos;s warm family letter...
            </p>
          ) : (
            briefText || <p className={isLight ? "text-slate-500" : "text-[#9AA3D6]"}>No recent activity to summarize for your view.</p>
          )}
        </div>

        {aiSource && (
          <div className={`text-[10px] font-mono flex items-center justify-between ${isLight ? "text-slate-500" : "text-[#9AA3D6]"}`}>
            <span>Grounding: Visible moments & audited tasks only</span>
            <span>
              Engine: <strong className={isLight ? "text-amber-700 uppercase" : "text-[#FFC66B] uppercase"}>{aiSource}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Share a Family Memory Input */}
      <form
        onSubmit={handleShareMemory}
        className={`rounded-2xl p-4 shadow-xl space-y-2 border transition-colors ${
          isLight
            ? "bg-white/98 backdrop-blur border-slate-200 text-slate-900"
            : "bg-[#262B52]/90 backdrop-blur border-[#3A4178] text-[#EDEAF6]"
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6]">
          <span>★</span>
          <span>Share a Family Memory or Story</span>
        </div>
        <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-[#9AA3D6]"}`}>
          Treasured memories (like Dadi&apos;s recipes or childhood stories) are shared with everyone as purple star tokens.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={memoryInput}
            onChange={(e) => setMemoryInput(e.target.value)}
            placeholder="e.g. Aaj Dadi ne apni purani kheer ki recipe sunayi..."
            className={`flex-1 rounded-xl px-3 py-2 text-xs outline-none border transition-colors ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:bg-white"
                : "bg-[#14182B] border-[#3A4178] text-[#EDEAF6] placeholder-[#9AA3D6]/50 focus:border-[#B08CFF]"
            }`}
          />
          <button
            type="submit"
            disabled={submittingMemory || !memoryInput.trim()}
            className="px-4 py-2 rounded-xl bg-[#B08CFF] hover:bg-[#C2A5FF] text-[#14182B] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </form>

      {/* Rebalance Care Work Section */}
      <div
        className={`rounded-2xl p-5 shadow-xl space-y-3 border transition-colors ${
          isLight
            ? "bg-white/98 backdrop-blur border-slate-200 text-slate-900"
            : "bg-[#262B52]/90 backdrop-blur border-[#3A4178] text-[#EDEAF6]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-sm">
              Caregiver Load Balance
            </h3>
            <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-[#9AA3D6]"}`}>
              Detect invisible planning burden and suggest routing preferences to restore fairness.
            </p>
          </div>
          <button
            onClick={handleProposeRebalance}
            disabled={proposalLoading}
            className="px-3 py-1.5 rounded-lg bg-[#FFC66B] hover:bg-[#FFD285] text-[#14182B] font-semibold text-xs transition-colors"
          >
            {proposalLoading ? "Evaluating..." : "Check Balance"}
          </button>
        </div>

        {proposal && (
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-[#14182B]/90 border-[#3A4178]"
            }`}
          >
            {proposal.visibility === "private_only" ? (
              <div className="flex items-start gap-2 text-amber-600">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs">
                  Rebalance proposals require mutual consent from all caregivers. Currently{" "}
                  <strong>{proposal.missing?.join(", ")}</strong> has not yet consented to share load data.
                </p>
              </div>
            ) : (
              <>
                <p className={`text-xs italic ${isLight ? "text-slate-800" : "text-[#EDEAF6]"}`}>
                  &ldquo;{proposal.rationale}&rdquo;
                </p>
                {proposal.moves && proposal.moves.length > 0 && (
                  <div className={`text-xs ${isLight ? "text-amber-800 font-medium" : "text-[#FFC66B]"}`}>
                    Suggested move: Route next {proposal.moves[0].count} {proposal.moves[0].kind} tasks to{" "}
                    <strong className="capitalize">{proposal.moves[0].toMemberId}</strong>.
                  </div>
                )}
                <div className={`flex justify-end pt-2 border-t ${isLight ? "border-slate-200" : "border-[#3A4178]"}`}>
                  <button
                    onClick={handleApproveProposal}
                    className="px-4 py-1.5 rounded-lg bg-[#5FD3A0] hover:bg-[#7AE0B2] text-[#14182B] font-semibold text-xs"
                  >
                    Approve 7-Day Rebalance
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
