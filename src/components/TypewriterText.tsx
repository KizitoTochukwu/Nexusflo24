import { useState, useEffect } from "react";

interface Segment {
  text: string;
  className?: string;
  isBreak?: boolean;
}

interface TypewriterTextProps {
  segments: Segment[];
  speed?: number;
  className?: string;
}

const TypewriterText = ({ segments, speed = 45, className }: TypewriterTextProps) => {
  const totalChars = segments.reduce((sum, s) => sum + (s.isBreak ? 0 : s.text.length), 0);
  const [count, setCount] = useState(0);
  const done = count >= totalChars;

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setCount((c) => c + 1), speed);
    return () => clearInterval(id);
  }, [done, speed]);

  let rendered = 0;

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.isBreak) return <br key={i} />;
        const start = rendered;
        rendered += seg.text.length;
        const visible = Math.max(0, Math.min(seg.text.length, count - start));
        if (visible === 0) return null;
        return (
          <span key={i} className={seg.className}>
            {seg.text.slice(0, visible)}
          </span>
        );
      })}
      <span className={`inline-block w-[3px] h-[0.85em] bg-accent ml-0.5 align-middle ${done ? "animate-cursor-blink" : ""}`} />
    </span>
  );
};

export default TypewriterText;
