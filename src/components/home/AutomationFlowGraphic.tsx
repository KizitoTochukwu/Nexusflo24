import { Brain, UserPlus, Mail, MessageSquare, MessageCircle, Calendar, TrendingUp } from "lucide-react";

/**
 * Animated automation flow diagram.
 * Pure SVG + CSS animations, no JS libs. Respects prefers-reduced-motion via Tailwind utilities.
 */
const AutomationFlowGraphic = () => {
  // Layout coordinates (viewBox 800x520)
  const sourceX = 100, sourceY = 260;          // Lead source (left)
  const hubX = 400, hubY = 260;                // AI Brain (center)
  const sinkX = 700, sinkY = 260;              // Sale (right)
  const channels = [
    { x: 280, y: 90,  label: "Email",    Icon: Mail },
    { x: 280, y: 200, label: "SMS",      Icon: MessageSquare },
    { x: 280, y: 320, label: "WhatsApp", Icon: MessageCircle },
    { x: 280, y: 430, label: "Booking",  Icon: Calendar },
  ];

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Floating gold dots background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-accent/40 animate-float motion-reduce:animate-none"
            style={{
              top: `${(i * 53) % 95}%`,
              left: `${(i * 37) % 95}%`,
              animationDelay: `${(i % 6) * 0.4}s`,
              animationDuration: `${3 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      <svg
        viewBox="0 0 800 520"
        className="relative w-full h-auto"
        role="img"
        aria-label="NexusFlo24 automation flow: leads enter, AI routes them across email, SMS, WhatsApp, and booking channels, and convert into sales."
      >
        <defs>
          <linearGradient id="goldStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hub glow */}
        <circle cx={hubX} cy={hubY} r="120" fill="url(#hubGlow)" className="animate-pulse-glow motion-reduce:animate-none" />

        {/* Connection paths: source -> channels -> hub -> sink */}
        {channels.map((ch, i) => {
          const pathIn = `M ${sourceX} ${sourceY} C ${sourceX + 80} ${sourceY}, ${ch.x - 60} ${ch.y}, ${ch.x} ${ch.y}`;
          const pathOut = `M ${ch.x} ${ch.y} C ${ch.x + 60} ${ch.y}, ${hubX - 80} ${hubY}, ${hubX} ${hubY}`;
          return (
            <g key={ch.label}>
              <path d={pathIn} stroke="hsl(var(--accent) / 0.15)" strokeWidth="1.5" fill="none" />
              <path d={pathOut} stroke="hsl(var(--accent) / 0.15)" strokeWidth="1.5" fill="none" />
              <path
                d={pathIn}
                stroke="url(#goldStroke)"
                strokeWidth="2"
                fill="none"
                strokeDasharray="6 200"
                className="animate-flow-particle motion-reduce:animate-none"
                style={{ animationDelay: `${i * 0.5}s` }}
              />
              <path
                d={pathOut}
                stroke="url(#goldStroke)"
                strokeWidth="2"
                fill="none"
                strokeDasharray="6 200"
                className="animate-flow-particle motion-reduce:animate-none"
                style={{ animationDelay: `${i * 0.5 + 1.2}s` }}
              />
            </g>
          );
        })}

        {/* Hub -> Sale */}
        <path d={`M ${hubX} ${hubY} L ${sinkX} ${sinkY}`} stroke="hsl(var(--accent) / 0.2)" strokeWidth="2" fill="none" />
        <path
          d={`M ${hubX} ${hubY} L ${sinkX} ${sinkY}`}
          stroke="url(#goldStroke)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="8 120"
          className="animate-flow-particle motion-reduce:animate-none"
          style={{ animationDelay: "0.3s" }}
        />

        {/* Source node: Lead */}
        <g>
          <circle cx={sourceX} cy={sourceY} r="42" fill="hsl(var(--card))" stroke="hsl(var(--accent) / 0.6)" strokeWidth="2" />
          <foreignObject x={sourceX - 16} y={sourceY - 24} width="32" height="32">
            <div className="flex h-full w-full items-center justify-center text-accent">
              <UserPlus className="h-6 w-6" />
            </div>
          </foreignObject>
          <text x={sourceX} y={sourceY + 14} textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">
            LEAD
          </text>
        </g>

        {/* Channel nodes */}
        {channels.map((ch, i) => (
          <g key={ch.label} className="motion-reduce:animate-none" style={{ transformOrigin: `${ch.x}px ${ch.y}px` }}>
            <circle
              cx={ch.x}
              cy={ch.y}
              r="36"
              fill="hsl(var(--card))"
              stroke="hsl(var(--accent) / 0.4)"
              strokeWidth="1.5"
              className="animate-orbit-soft motion-reduce:animate-none"
              style={{ animationDelay: `${i * 0.3}s`, transformOrigin: `${ch.x}px ${ch.y}px` }}
            />
            <foreignObject x={ch.x - 14} y={ch.y - 22} width="28" height="28">
              <div className="flex h-full w-full items-center justify-center text-accent">
                <ch.Icon className="h-5 w-5" />
              </div>
            </foreignObject>
            <text x={ch.x} y={ch.y + 12} textAnchor="middle" className="fill-foreground" fontSize="10" fontWeight="600">
              {ch.label.toUpperCase()}
            </text>
          </g>
        ))}

        {/* Hub node: AI Brain */}
        <g filter="url(#softGlow)">
          <circle
            cx={hubX}
            cy={hubY}
            r="58"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--accent))"
            strokeWidth="2.5"
            className="animate-pulse-glow motion-reduce:animate-none"
          />
          <foreignObject x={hubX - 22} y={hubY - 30} width="44" height="44">
            <div className="flex h-full w-full items-center justify-center text-accent">
              <Brain className="h-9 w-9" />
            </div>
          </foreignObject>
          <text x={hubX} y={hubY + 22} textAnchor="middle" className="fill-accent" fontSize="11" fontWeight="700">
            AI CORE
          </text>
        </g>

        {/* Sink node: Sale */}
        <g>
          <circle
            cx={sinkX}
            cy={sinkY}
            r="46"
            fill="hsl(var(--accent))"
            stroke="hsl(var(--accent))"
            strokeWidth="2"
            className="animate-pulse-glow motion-reduce:animate-none"
          />
          <foreignObject x={sinkX - 18} y={sinkY - 26} width="36" height="36">
            <div className="flex h-full w-full items-center justify-center text-primary">
              <TrendingUp className="h-7 w-7" />
            </div>
          </foreignObject>
          <text x={sinkX} y={sinkY + 16} textAnchor="middle" className="fill-primary" fontSize="11" fontWeight="700">
            SALE
          </text>
        </g>
      </svg>
    </div>
  );
};

export default AutomationFlowGraphic;
