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
import { Plus, User, Link2, BarChart3, Handshake, UserCheck } from "lucide-react";
import {
  CONTACT_VARIABLES, LEAD_VARIABLES, DEAL_VARIABLES, ASSIGNED_USER_VARIABLES, AUTOMATION_LINKS,
} from "./editorConstants";

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
            <User className="h-4 w-4 mr-2" /> Contact
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {CONTACT_VARIABLES.map((v) => (
              <DropdownMenuItem key={v.value} onClick={() => onInsert(v.value)}>
                {v.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger><BarChart3 className="h-4 w-4 mr-2" /> Lead</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            {LEAD_VARIABLES.map((v) => <DropdownMenuItem key={v.value} onClick={() => onInsert(v.value)}>{v.label}</DropdownMenuItem>)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Handshake className="h-4 w-4 mr-2" /> Opportunity</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56 max-h-80 overflow-y-auto">
            {DEAL_VARIABLES.map((v) => <DropdownMenuItem key={v.value} onClick={() => onInsert(v.value)}>{v.label}</DropdownMenuItem>)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger><UserCheck className="h-4 w-4 mr-2" /> Assigned User</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            {ASSIGNED_USER_VARIABLES.map((v) => <DropdownMenuItem key={v.value} onClick={() => onInsert(v.value)}>{v.label}</DropdownMenuItem>)}
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

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
