import logoWhite from "@/assets/brand-logo-white.png.asset.json";
import logoEmblem from "@/assets/brand-logo-emblem.png.asset.json";

const SidebarLogo = ({ collapsed = false }: { collapsed?: boolean }) => {
  if (collapsed) {
    return (
      <img
        src={logoEmblem.url}
        alt="NexusFlo24"
        width={32}
        height={32}
        className="h-8 w-8 object-contain shrink-0"
      />
    );
  }

  return (
    <img
      src={logoWhite.url}
      alt="NexusFlo24"
      width={148}
      height={41}
      className="h-9 w-auto object-contain shrink-0"
    />
  );
};

export default SidebarLogo;
