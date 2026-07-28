import React from "react";
import { MacbookScroll } from "./ui/macbook-scroll";

export default function MacbookScrollDemo({
  title,
  children,
  badge
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="w-full overflow-hidden bg-gradient-to-b from-[#090d1a] via-[#050711] to-[#020306] p-4 sm:p-6 rounded-3xl border border-cyan-500/40 shadow-2xl">
      <MacbookScroll
        title={
          title || (
            <span className="text-white font-mono font-black text-xl sm:text-2xl">
              ⚡ VERTICAL LAB — 3D Athlete Dossier Showcase <br />
              <span className="text-cyan-400 text-xs sm:text-sm font-sans font-bold">عَرْض وتوليد فيديو تفاعلي 3D لبطاقة الأداء الحركي للاعب</span>
            </span>
          )
        }
        badge={
          badge || (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-cyan-300 text-[10px] font-mono font-bold">
              <span>🚀 VERTICAL BIOMEX</span>
            </div>
          )
        }
        showGradient={false}
      >
        {children}
      </MacbookScroll>
    </div>
  );
}
