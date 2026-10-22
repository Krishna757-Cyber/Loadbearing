"use client";

import React, { useState, useRef } from "react";
import { Mic, Send, Sparkles, Check, X, Volume2 } from "lucide-react";
import { useAppStore } from "@/store";
import { t, getLocaleForLanguage } from "@/lib/i18n";

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }>> }) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    SpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function VoiceOrb() {
  const viewerId = useAppStore((s) => s.viewerId);
  const language = useAppStore((s) => s.language);
  const setActiveFlightHandoffId = useAppStore((s) => s.setActiveFlightHandoffId);
  const addToast = useAppStore((s) => s.addToast);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentLine, setAgentLine] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<"bedrock" | "rules" | null>(null);
  const [pendingConsentMomentId, setPendingConsentMomentId] = useState<string | null>(null);
  const [_pendingConsentSummary, setPendingConsentSummary] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Spoken feedback helper using Web Speech Synthesis
  const speakLine = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLocaleForLanguage(language);
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis unsupported or blocked
    }
  };

  // Sample phrases from spec
  const SAMPLE_PHRASES = [
    {
      label: "Physiotherapy & Transport",
      text: "I researched clinics and booked Dadi's physiotherapy for Friday, but I can't arrange transport.",
      lang: "en",
    },
    {
      label: "Dadi's Kheer Recipe",
      text: "Aaj Dadi ne apni purani kheer ki recipe sunayi.",
      lang: "hi",
    },
    {
      label: "Tired on Call (Private)",
      text: "Dadi sounded tired on the call today.",
      lang: "en",
    },
  ];

  // Process text through capture_moment
  const processMessage = async (text: string) => {
    if (!text.trim()) return;
    setTranscript(text);
    setActiveTool("capture_moment");
    setAgentLine("Classifying moment and calculating load contributions...");

    try {
      const res = await fetch("/api/tools/capture_moment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source: "voice",
          captured_by: viewerId,
          language,
        }),
      });

      const data = await res.json();
      setActiveTool(null);

      if (data.isError) {
        setAgentLine(data.error?.message || "Could not process spoken note.");
        return;
      }

      const structured = data.structuredContent;
      if (structured) {
        setAiSource(structured.ai_source ?? "rules");
        const nextAction = structured.next;

        if (nextAction === "ask_consent") {
          setPendingConsentMomentId(structured.moment_id);
          setPendingConsentSummary(structured.classification?.summary || text);
          const reply = structured.message ||
            "I credited your contribution. Care task is open. Share this with your fellow caregivers?";
          setAgentLine(reply);
          speakLine(reply);
        } else if (nextAction === "emergency_card") {
          const reply = "Critical health indicator detected. Please call emergency services immediately if Dadi is in danger.";
          setAgentLine(reply);
          speakLine(reply);
        } else {
          const reply = structured.message || "Moment captured and recorded.";
          setAgentLine(reply);
          speakLine(reply);
        }
      }
    } catch {
      setActiveTool(null);
      setAgentLine("Could not reach the server. Your note is saved locally.");
    }
  };

  // Handle consent confirmation
  const handleConsent = async (consent: boolean) => {
    if (!pendingConsentMomentId) return;

    if (!consent) {
      setPendingConsentMomentId(null);
      setAgentLine("Kept private. This moment is visible only to you.");
      speakLine("Kept private.");
      return;
    }

    setActiveTool("create_handoff");
    setAgentLine("Routing task to awake caregiver with lowest load...");

    try {
      const caregiversToShare = ["priya", "arjun", "meera"].filter((id) => id !== viewerId);
      const res = await fetch("/api/tools/create_handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moment_id: pendingConsentMomentId,
          actor_id: viewerId,
          share_with: caregiversToShare,
        }),
      });

      const data = await res.json();
      setActiveTool(null);
      setPendingConsentMomentId(null);

      if (data.isError) {
        setAgentLine(data.error?.message || "Failed to create handoff.");
        return;
      }

      const structured = data.structuredContent;
      if (structured) {
        setAiSource(structured.ai_source ?? "rules");
        if (structured.handoff_id) {
          setActiveFlightHandoffId(structured.handoff_id);
        }
        const explanationText =
          typeof structured.explanation === "string"
            ? structured.explanation
            : structured.explanation?.text;
        const reply = explanationText || `Task routed to ${structured.assignee_id}.`;
        setAgentLine(reply);
        speakLine(reply);
        addToast("Handoff created and routed successfully", "success");
      }
    } catch {
      setActiveTool(null);
      setAgentLine("Error creating handoff.");
    }
  };

  // Toggle voice recognition
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      addToast("Speech recognition is not supported in this browser. Please type instead.", "info");
      setShowManualInput(true);
      return;
    }

    try {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = getLocaleForLanguage(language);

      rec.onresult = (event) => {
        const text = event.results[event.resultIndex]?.[0]?.transcript ?? "";
        setTranscript(text);
      };

      rec.onerror = (e) => {
        setIsListening(false);
        if (e.error === "not-allowed") {
          addToast("Microphone access is blocked. Allow it in the address bar, or type instead.", "error");
        }
      };

      rec.onend = () => {
        setIsListening(false);
        if (transcript.trim()) {
          processMessage(transcript);
        }
      };

      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
      setTranscript("");
      setAgentLine("Listening to your voice...");
    } catch {
      setIsListening(false);
      setShowManualInput(true);
    }
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 select-none pointer-events-auto max-w-lg w-full px-4">
      {/* Sample phrase chips */}
      <div className="flex flex-wrap items-center justify-center gap-1 mb-0.5">
        {SAMPLE_PHRASES.map((sp, idx) => (
          <button
            key={idx}
            onClick={() => processMessage(sp.text)}
            className="px-2.5 py-0.5 rounded-full bg-[#14182B]/85 hover:bg-[#262B52] border border-[#3A4178] text-[10px] text-[#EDEAF6] transition-all shadow-sm hover:border-[#FFC66B]"
          >
            {sp.label}
          </button>
        ))}
      </div>

      {/* Tool invocation badge */}
      {activeTool && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFC66B]/20 border border-[#FFC66B] text-[#FFC66B] text-[11px] font-mono animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Invoking {activeTool}...</span>
        </div>
      )}

      {/* Agent line / transcript speech bubble */}
      {(transcript || agentLine) && (
        <div className="w-full max-w-md bg-[#262B52]/95 backdrop-blur border border-[#3A4178] rounded-xl p-3 shadow-xl text-center text-xs space-y-1.5">
          {transcript && (
            <p className="text-[#9AA3D6] italic">&ldquo;{transcript}&rdquo;</p>
          )}
          {agentLine && (
            <div className="flex items-start justify-center gap-2 text-[#EDEAF6] font-medium">
              <Volume2 className="w-4 h-4 text-[#FFC66B] shrink-0 mt-0.5" />
              <span>{agentLine}</span>
            </div>
          )}

          {/* AI source tag */}
          {aiSource && (
            <div className="text-[10px] text-[#9AA3D6] font-mono">
              Engine: <span className="text-[#FFC66B] uppercase">{aiSource}</span>
            </div>
          )}

          {/* Consent decision buttons */}
          {pendingConsentMomentId && (
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-[#3A4178]">
              <button
                onClick={() => handleConsent(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#14182B] border border-[#3A4178] text-[#9AA3D6] hover:text-[#EDEAF6] text-xs font-semibold"
              >
                <X className="w-3.5 h-3.5" /> {t("keepPrivate", language)}
              </button>
              <button
                onClick={() => handleConsent(true)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#FFC66B] text-[#14182B] text-xs font-semibold hover:bg-[#FFD285]"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" /> {t("shareWithFamily", language)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voice Orb and manual input controls */}
      <div className="flex items-center gap-3">
        {/* Toggle manual text input */}
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="p-2 rounded-full bg-[#262B52] border border-[#3A4178] text-[#9AA3D6] hover:text-[#EDEAF6] shadow-md transition-colors"
          title={t("typeInstead", language)}
        >
          <Send className="w-4 h-4" />
        </button>

        {/* The Voice Orb Button */}
        <button
          onClick={toggleListening}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none ${
            isListening
              ? "bg-[#FFC66B] text-[#14182B] scale-105 shadow-[#FFC66B]/50 ring-4 ring-[#FFC66B]/30"
              : "bg-[#262B52] border-2 border-[#FFC66B] text-[#FFC66B] hover:scale-105 hover:bg-[#2A3160]"
          }`}
          title={isListening ? t("listening", language) : t("speakToAlexa", language)}
          aria-label={isListening ? "Stop listening" : "Start voice capture"}
        >
          {/* Animated pulse rings when listening */}
          {isListening && (
            <span className="absolute inset-0 rounded-full border-2 border-[#FFC66B] animate-ping opacity-75" />
          )}
          <Mic className={`w-7 h-7 ${isListening ? "stroke-[2.5]" : "stroke-2"}`} />
        </button>
      </div>

      {/* Manual text input drawer */}
      {showManualInput && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualText.trim()) {
              processMessage(manualText);
              setManualText("");
            }
          }}
          className="flex items-center gap-2 w-full max-w-md bg-[#262B52] border border-[#3A4178] rounded-xl p-1.5 shadow-xl"
        >
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={t("typePlaceholder", language)}
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#EDEAF6] placeholder-[#9AA3D6]/50 outline-none"
          />
          <button
            type="submit"
            className="p-1.5 rounded-lg bg-[#FFC66B] text-[#14182B] hover:bg-[#FFD285]"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
