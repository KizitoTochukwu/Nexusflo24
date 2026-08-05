import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, ArrowRight } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import CustomFieldsManager from "@/components/crm/settings/CustomFieldsManager";
import TagsManager from "@/components/crm/settings/TagsManager";

const DashboardCrmSettings = () => {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const { canManage } = useWorkspaceRole();

  return (
    <div className="space-y-6">
      <Seo title="CRM Settings | NexusFlo24" description="Configure custom fields, tags and pipelines for your CRM." />

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">CRM Settings</h1>
          <p className="text-sm text-muted-foreground">
            Tailor your CRM: custom fields, shared tags and sales pipelines.
          </p>
        </div>
      </div>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">Custom fields</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="mt-5">
          <CustomFieldsManager workspaceId={workspaceId} canManage={canManage} />
        </TabsContent>

        <TabsContent value="tags" className="mt-5">
          <TagsManager workspaceId={workspaceId} canManage={canManage} />
        </TabsContent>

        <TabsContent value="pipelines" className="mt-5">
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <div>
                <h2 className="text-base font-semibold">Sales pipelines &amp; stages</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pipelines, stage names, win probabilities and colours are managed directly on the Deals board so you
                  can see the impact as you edit.
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => navigate(`/dashboard/${workspaceId}/crm/deals`)}
              >
                Open Deals board <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardCrmSettings;
