import { Settings2 } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import CustomFieldsManager from "@/components/crm/settings/CustomFieldsManager";

const DashboardCrmFields = () => {
  const workspaceId = useWorkspaceId();
  const { canManage } = useWorkspaceRole();

  return (
    <div className="space-y-6">
      <Seo title="Custom Fields | NexusFlo24 CRM" description="Define custom fields for contacts, companies and deals." />

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Custom Fields</h1>
          <p className="text-sm text-muted-foreground">Capture the data your business needs on every record type.</p>
        </div>
      </div>

      <CustomFieldsManager workspaceId={workspaceId} canManage={canManage} />
    </div>
  );
};

export default DashboardCrmFields;
