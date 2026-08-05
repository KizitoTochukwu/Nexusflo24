import { Tags } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import TagsManager from "@/components/crm/settings/TagsManager";

const DashboardCrmTags = () => {
  const workspaceId = useWorkspaceId();
  const { canManage } = useWorkspaceRole();

  return (
    <div className="space-y-6">
      <Seo title="Tags | NexusFlo24 CRM" description="Manage the shared tag library used across contacts, companies and deals." />

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Tags className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">One shared tag library across every CRM record.</p>
        </div>
      </div>

      <TagsManager workspaceId={workspaceId} canManage={canManage} />
    </div>
  );
};

export default DashboardCrmTags;
