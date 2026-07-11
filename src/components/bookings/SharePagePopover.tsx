import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function SharePagePopover({ url, title }: { url: string; title: string }) {
  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"><Share2 className="mr-1 h-3 w-3" /> Share</Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Share "{title}"</div>
        <button className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent" onClick={copy}>
          <Copy className="h-4 w-4" /> Copy link
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent("Book a time with me")}&body=${encodeURIComponent(url)}`}
          className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
        >
          <Mail className="h-4 w-4" /> Send via email
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Book a time: ${url}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
        >
          <MessageCircle className="h-4 w-4" /> Share on WhatsApp
        </a>
      </PopoverContent>
    </Popover>
  );
}
