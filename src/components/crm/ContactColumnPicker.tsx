import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Columns3 } from "lucide-react";
import { CONTACT_COLUMNS, DEFAULT_CONTACT_COLUMNS, type ContactColumnKey } from "@/lib/crm/constants";

type Props = {
  value: ContactColumnKey[];
  onChange: (next: ContactColumnKey[]) => void;
};

const ContactColumnPicker = ({ value, onChange }: Props) => {
  const toggle = (key: ContactColumnKey) => {
    if (value.includes(key)) onChange(value.filter((k) => k !== key));
    else onChange([...value, key]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="mr-2 h-4 w-4" /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Visible columns</DropdownMenuLabel>
        <div className="max-h-72 space-y-1 overflow-y-auto px-2 py-1">
          {CONTACT_COLUMNS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
              <Checkbox
                checked={value.includes(c.key)}
                disabled={c.alwaysOn}
                onCheckedChange={() => toggle(c.key)}
                aria-label={c.label}
              />
              <span className={c.alwaysOn ? "text-muted-foreground" : ""}>{c.label}</span>
            </label>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="px-2 py-1">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(DEFAULT_CONTACT_COLUMNS)}>
            Reset to default
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ContactColumnPicker;
