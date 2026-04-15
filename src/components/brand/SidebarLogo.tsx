import logoFull from "@/assets/nexusflo24-logo-full.png";
import logoIcon from "@/assets/nexusflo24-logo.png";

const SidebarLogo = ({ collapsed = false }: { collapsed?: boolean }) => {
  if (collapsed) {
    return (
      <img
        src={logoIcon}
        alt="NexusFlo24"
        className="h-8 w-8 rounded-lg object-cover shrink-0"
      />
    );
  }

  return (
    <img
      src={logoFull}
      alt="NexusFlo24"
      className="h-10 w-auto object-contain shrink-0"
    />
  );
};

export default SidebarLogo;
