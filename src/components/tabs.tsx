"use client";
import { useState, type ReactNode } from "react";

export function Tabs({ tabs, initial = 0 }: { tabs: { label: ReactNode; content: ReactNode }[]; initial?: number }) {
  const [active, setActive] = useState(initial);
  return (
    <div>
      <div className="pk-tabs" role="tablist">
        {tabs.map((t, i) => (
          <button key={i} type="button" role="tab" className="pk-tab" aria-selected={i === active} onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="pk-tabpanel" role="tabpanel">
        {tabs[active]?.content}
      </div>
    </div>
  );
}
