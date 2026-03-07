import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, User, Link2, BarChart3 } from "lucide-react";
import { VARIABLE_OPTIONS, AUTOMATION_LINKS, CRM_DATA } from "./editorConstants";

interface InsertDropdownProps {
  onInsert: (value: string) => void;
}

export default function InsertDropdown({ onInsert }: InsertDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" /> Insert
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <User className="h-4 w-4 mr-2" /> Variables
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {VARIABLE_OPTIONS.map((v) => (
              <DropdownMenuItem key={v.value} onClick={() => onInsert(v.value)}>
                <span className="text-muted-foreground font-mono text-xs mr-2">{v.value}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Link2 className="h-4 w-4 mr-2" /> Automation Links
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            {AUTOMATION_LINKS.map((v) => (
              <DropdownMenuItem key={v.value} onClick={() => onInsert(v.value)}>
                {v.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <BarChart3 className="h-4 w-4 mr-2" /> Dynamic CRM Data
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            {CRM_DATA.map((v) => (
              <DropdownMenuItem key={v.value} onClick={() => onInsert(v.value)}>
                {v.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
