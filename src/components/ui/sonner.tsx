import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand
      richColors={false}
      closeButton
      duration={4500}
      gap={12}
      offset={24}
      icons={{
        success: <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2.25} />,
        error: <XCircle className="h-[18px] w-[18px]" strokeWidth={2.25} />,
        warning: <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2.25} />,
        info: <Info className="h-[18px] w-[18px]" strokeWidth={2.25} />,
        loading: <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2.25} />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: [
            // Base premium card
            "group/toast pointer-events-auto relative flex w-full items-start gap-3",
            "rounded-[14px] border border-border/70 bg-gradient-to-br from-card to-surface",
            "px-4 py-3.5 pr-9 text-foreground",
            "shadow-[0_10px_40px_-12px_hsl(213_70%_14%/0.18),0_2px_8px_-2px_hsl(213_70%_14%/0.08)]",
            "backdrop-blur-sm",
            // Accent rail (left edge)
            "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]",
            "before:rounded-l-[14px] before:bg-accent before:content-['']",
            // Animations
            "data-[mounted=true]:animate-in data-[mounted=true]:fade-in-0 data-[mounted=true]:slide-in-from-right-4",
            "data-[removed=true]:animate-out data-[removed=true]:fade-out-0 data-[removed=true]:slide-out-to-right-4",
            "transition-all duration-200",
          ].join(" "),
          title: "text-sm font-semibold leading-tight text-primary",
          description: "mt-1 text-xs leading-relaxed text-muted-foreground",
          icon: [
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            "bg-accent/10 text-accent",
            "[&>svg]:h-[18px] [&>svg]:w-[18px]",
          ].join(" "),
          content: "flex flex-1 flex-col min-w-0",
          actionButton: [
            "inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium",
            "bg-primary text-primary-foreground transition-colors",
            "hover:bg-primary/90 hover:ring-2 hover:ring-accent/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
          ].join(" "),
          cancelButton: [
            "inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium",
            "bg-muted text-muted-foreground transition-colors hover:bg-muted/80",
          ].join(" "),
          closeButton: [
            "!absolute !right-2 !top-2 !left-auto !translate-x-0 !translate-y-0",
            "!flex !h-6 !w-6 !items-center !justify-center !rounded-md",
            "!border-0 !bg-transparent !text-muted-foreground",
            "!opacity-0 group-hover/toast:!opacity-100",
            "hover:!bg-muted hover:!text-foreground",
            "transition-opacity",
          ].join(" "),
          success: "before:!bg-emerald-500 [&>[data-icon]]:!bg-emerald-500/10 [&>[data-icon]]:!text-emerald-600",
          error: "before:!bg-destructive [&>[data-icon]]:!bg-destructive/10 [&>[data-icon]]:!text-destructive",
          warning: "before:!bg-accent [&>[data-icon]]:!bg-accent/15 [&>[data-icon]]:!text-accent-foreground",
          info: "before:!bg-primary [&>[data-icon]]:!bg-primary/10 [&>[data-icon]]:!text-primary",
          loading: "before:!bg-muted-foreground [&>[data-icon]]:!bg-muted [&>[data-icon]]:!text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
