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
  const household = useAppStore((s) => s.household);
  const addToast = useAppStore((s) => s.addToast);

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
      <div className="bg-[#262B52]/90 backdrop-blur border border-[#3A4178] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#3A4178]">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#FF7A7A]" />
            <h2 className="font-display text-base font-semibold text-[#EDEAF6]">
              {language === "hi" ? "दैनिक निरंतरता पत्र" : "Family Continuity Brief"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {briefText && (
              <button
                onClick={speakBrief}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14182B] border border-[#3A4178] hover:border-[#FFC66B] text-[#FFC66B] font-medium transition-colors"
                title="Read brief aloud"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listen</span>
              </button>
            )}
            <button
              onClick={fetchBrief}
              disabled={loading}
              className="p-1.5 rounded-lg bg-[#14182B] border border-[#3A4178] text-[#9AA3D6] hover:text-[#EDEAF6]"
              title="Refresh brief"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-[#14182B]/60 p-2.5 rounded-xl border border-[#3A4178]/60">
              <span className="block font-mono text-base font-bold text-[#5FD3A0]">
                {stats.resolved}
              </span>
              <span className="text-[10px] text-[#9AA3D6] uppercase tracking-wider">Resolved</span>
            </div>
            <div className="bg-[#14182B]/60 p-2.5 rounded-xl border border-[#3A4178]/60">
              <span className="block font-mono text-base font-bold text-[#5B9CFF]">
                {stats.open}
              </span>
              <span className="text-[10px] text-[#9AA3D6] uppercase tracking-wider">Open</span>
            </div>
            <div className="bg-[#14182B]/60 p-2.5 rounded-xl border border-[#3A4178]/60">
              <span className="block font-mono text-base font-bold text-[#B08CFF]">
                {stats.memories_shared}
              </span>
              <span className="text-[10px] text-[#9AA3D6] uppercase tracking-wider">Memories</span>
            </div>
            <div className="bg-[#14182B]/60 p-2.5 rounded-xl border border-[#3A4178]/60">
              <span className="block font-mono text-base font-bold text-[#FFC66B]">
                {stats.unowned}
              </span>
              <span className="text-[10px] text-[#9AA3D6] uppercase tracking-wider">Unowned</span>
            </div>
          </div>
        )}

        {/* Letter body */}
        <div className="bg-[#14182B]/80 p-4 rounded-xl border-l-2 border-[#FFC66B] text-[#EDEAF6] leading-relaxed text-sm">
          {loading ? (
            <p className="text-[#9AA3D6] animate-pulse">Composing today&apos;s warm family letter...</p>
          ) : (
            briefText || <p className="text-[#9AA3D6]">No recent activity to summarize for your view.</p>
          )}
        </div>

        {aiSource && (
          <div className="text-[10px] text-[#9AA3D6] font-mono flex items-center justify-between">
            <span>Grounding: Visible moments & audited tasks only</span>
            <span>
              Engine: <strong className="text-[#FFC66B] uppercase">{aiSource}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Share a Family Memory Input */}
      <form
        onSubmit={handleShareMemory}
        className="bg-[#262B52]/90 backdrop-blur border border-[#3A4178] rounded-2xl p-4 shadow-xl space-y-2"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B08CFF]">
          <span>★</span>
          <span>Share a Family Memory or Story</span>
        </div>
        <p className="text-[11px] text-[#9AA3D6]">
          Treasured memories (like Dadi&apos;s recipes or childhood stories) are shared with everyone as purple star tokens.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={memoryInput}
            onChange={(e) => setMemoryInput(e.target.value)}
            placeholder="e.g. Aaj Dadi ne apni purani kheer ki recipe sunayi..."
            className="flex-1 bg-[#14182B] border border-[#3A4178] rounded-xl px-3 py-2 text-xs text-[#EDEAF6] placeholder-[#9AA3D6]/50 outline-none focus:border-[#B08CFF]"
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
      <div className="bg-[#262B52]/90 backdrop-blur border border-[#3A4178] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-sm text-[#EDEAF6]">
              Caregiver Load Balance
            </h3>
            <p className="text-[11px] text-[#9AA3D6]">
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
          <div className="bg-[#14182B]/90 p-4 rounded-xl border border-[#3A4178] space-y-3">
            {proposal.visibility === "private_only" ? (
              <div className="flex items-start gap-2 text-[#FFB547]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs">
                  Rebalance proposals require mutual consent from all caregivers. Currently{" "}
                  <strong>{proposal.missing?.join(", ")}</strong> has not yet consented to share load data.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#EDEAF6] italic">&ldquo;{proposal.rationale}&rdquo;</p>
                {proposal.moves && proposal.moves.length > 0 && (
                  <div className="text-xs text-[#FFC66B]">
                    Suggested move: Route next {proposal.moves[0].count} {proposal.moves[0].kind} tasks to{" "}
                    <strong className="capitalize">{proposal.moves[0].toMemberId}</strong>.
                  </div>
                )}
                <div className="flex justify-end pt-2 border-t border-[#3A4178]">
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
