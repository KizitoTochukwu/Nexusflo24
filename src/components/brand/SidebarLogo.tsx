import nexusLogo from "@/assets/nexusflo24-logo.png";

const SidebarLogo = ({ collapsed = false }: { collapsed?: boolean }) => {
  if (collapsed) {
    return (
      <img
        src={nexusLogo}
        alt="NexusFlo24 Logo"
        className="h-8 w-8 rounded-lg object-cover shrink-0"
      />
    );
  }

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <img
        src={nexusLogo}
        alt="NexusFlo24 Logo"
        className="h-8 w-8 rounded-lg object-cover"
      />
      <span className="text-lg font-bold text-primary-foreground">
        Nexus<span className="text-gradient-gold">Flo24</span>
      </span>
    </div>
  );
};

export default SidebarLogo;
