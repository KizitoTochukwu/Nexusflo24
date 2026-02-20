const SidebarLogo = ({ collapsed = false }: { collapsed?: boolean }) => {
  if (collapsed) {
    // Mini icon-only version for collapsed sidebar
    return (
      <svg
        viewBox="0 0 80 80"
        className="h-8 w-8 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="NexusFlo24 Logo"
      >
        <defs>
          <linearGradient id="gold-grad-mini" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A843" />
            <stop offset="100%" stopColor="#B8912E" />
          </linearGradient>
        </defs>
        <rect width="80" height="80" rx="16" fill="hsl(213 70% 14%)" />
        {/* N letter */}
        <path
          d="M22 60V22h8l18 26V22h8v38h-8L30 34v26z"
          fill="white"
        />
        {/* Gold bar accent */}
        <rect x="48" y="22" width="8" height="38" rx="2" fill="url(#gold-grad-mini)" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 300 80"
      className="h-8 w-auto max-w-[140px] shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NexusFlo24 Logo"
    >
      <defs>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4A843" />
          <stop offset="50%" stopColor="#C9993A" />
          <stop offset="100%" stopColor="#B8912E" />
        </linearGradient>
      </defs>
      {/* Icon container */}
      <rect x="0" y="4" width="72" height="72" rx="14" fill="hsl(213 70% 14%)" />
      {/* N letter */}
      <path
        d="M18 58V22h6l16 24V22h6v36h-6L24 34v24z"
        fill="white"
      />
      {/* Gold bar */}
      <rect x="46" y="22" width="7" height="36" rx="2" fill="url(#gold-grad)" />
      {/* NEXUS text */}
      <text
        x="84"
        y="50"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="28"
        letterSpacing="0.5"
        fill="white"
      >
        <tspan fill="white">Nexus</tspan>
        <tspan fill="url(#gold-grad)">Flo24</tspan>
      </text>
    </svg>
  );
};

export default SidebarLogo;
