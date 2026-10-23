import { useEffect, useRef, useState } from "react";
import AutomationFlowGraphic from "./AutomationFlowGraphic";

const stats = [
  { value: "3", label: "Channels: Email, WhatsApp & SMS" },
  { value: "24/7", label: "Automated lead capture" },
  { value: "14-day", label: "Free trial on Starter" },
];

const StatItem = ({ stat }: { stat: typeof stats[number] }) => (
  <div className="text-center">
    <div className="text-3xl font-bold text-accent md:text-4xl">{stat.value}</div>
    <div className="mt-1 text-sm text-primary-foreground/70">{stat.label}</div>
  </div>
);

const MotionShowcaseSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-hero py-20 md:py-28"
      aria-labelledby="motion-showcase-heading"
    >
      {/* Subtle radial accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--accent)/0.12),transparent_60%)]" />

      <div className="container relative">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">
            See it in motion
          </span>
          <h2
            id="motion-showcase-heading"
            className="mt-3 text-3xl font-bold text-primary-foreground md:text-5xl"
          >
            See NexusFlo24 in <span className="text-gradient-gold">Motion</span>
          </h2>
          <p className="mt-4 text-base text-primary-foreground/80 md:text-lg">
            Watch how AI captures every lead, routes them through the perfect channel, and converts them into customers — all on autopilot.
          </p>
        </div>

        <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <AutomationFlowGraphic />
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-4 border-t border-accent/20 pt-8 md:gap-8 md:pt-10">
          {stats.map((s) => (
            <StatItem key={s.label} stat={s} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MotionShowcaseSection;
