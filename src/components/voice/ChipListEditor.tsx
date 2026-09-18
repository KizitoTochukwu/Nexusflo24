import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Small add/remove list used throughout the assistant setup. */
export default function ChipListEditor({
  value, onChange, placeholder, emptyHint,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyHint?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const entry = draft.trim();
    if (!entry || value.includes(entry)) { setDraft(""); return; }
    onChange([...value, entry]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} />
        <Button type="button" variant="secondary" onClick={add} disabled={!draft.trim()}>Add</Button>
      </div>
      {value.length === 0 ? (
        emptyHint ? <p className="text-xs text-muted-foreground">{emptyHint}</p> : null
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 rounded-full py-1 pl-3 pr-1.5">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                className="rounded-full p-0.5 hover:bg-background/60"
                onClick={() => onChange(value.filter((v) => v !== item))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
