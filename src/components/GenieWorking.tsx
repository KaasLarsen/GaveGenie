"use client";

import { useEffect, useState } from "react";
import { GenieMark } from "./GenieMark";

const STATUS_LINES = [
  "Genie læser dine ønsker…",
  "Gennemgår kataloget…",
  "Vælger de bedste match…",
] as const;

type GenieWorkingProps = {
  className?: string;
};

/** Animated genie + rotating status while gift search is in flight. */
export function GenieWorking({ className }: GenieWorkingProps) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={`genie-working${className ? ` ${className}` : ""}`}>
      <div className="genie-working__mark" aria-hidden>
        <GenieMark className="genie-working__svg" />
      </div>
      <p className="genie-working__status" aria-live="polite">
        {STATUS_LINES[lineIndex]}
      </p>
    </div>
  );
}
