"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export function Legend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-20 select-none">
      <div className="bg-[#262B52]/90 backdrop-blur border border-[#3A4178] rounded-xl shadow-lg p-2.5 text-xs text-[#EDEAF6] transition-all">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-medium hover:text-[#FFC66B] transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#FFC66B]" />
          <span>Token Legend</span>
          {expanded ? <ChevronDown className="w-3 h-3 text-[#9AA3D6]" /> : <ChevronUp className="w-3 h-3 text-[#9AA3D6]" />}
        </button>

        {expanded && (
          <div className="mt-2.5 pt-2 border-t border-[#3A4178] space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B9CFF]" />
              <span className="text-[#9AA3D6]">Contribution (Disc)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-[#FFB547] animate-pulse-waiting" />
              <span className="text-[#9AA3D6]">Awaiting Acceptance (Torus)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 text-[#FF7A7A] font-bold">▲</span>
              <span className="text-[#9AA3D6]">Urgent Task (Octahedron)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 text-[#B08CFF]">★</span>
              <span className="text-[#9AA3D6]">Family Memory (Star)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5FD3A0] text-[9px] flex items-center justify-center text-[#14182B] font-bold">✓</span>
              <span className="text-[#9AA3D6]">Resolved Task (Check)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
