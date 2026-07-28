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
    <div className="w-full overflow-hidden bg-black/90 p-4 rounded-3xl border border-cyan-500/30">
      <MacbookScroll
        title={
          title || (
            <span className="text-white font-mono font-black text-2xl">
              ⚡ VERTICAL LAB — 3D Athlete Dossier Showcase <br />
              <span className="text-cyan-400 text-sm font-sans">عَرْض تفاعلي 3D لبطاقة الأداء الحركي للاعب</span>
            </span>
          )
        }
        badge={
          badge || (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs font-mono font-bold">
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
