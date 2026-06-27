import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useNIReport } from "@/lib/nexusintel/hooks";
import ReportView from "@/components/nexusintel/ReportView";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, FileText, Sheet } from "lucide-react";
import { toast } from "sonner";

export default function NIReportDetail() {
  const workspaceId = useWorkspaceId();
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading } = useNIReport(workspaceId, id);

  if (isLoading) {
    return <DashboardLayout><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  }
  if (!report) {
    return <DashboardLayout><p>Report not found.</p></DashboardLayout>;
  }

  const placeholder = (label: string) => () => toast.info(`${label} — coming soon.`);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/dashboard/${workspaceId}/nexusintel/reports`}>
            <ArrowLeft className="h-4 w-4" /> Back to reports
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {report.report.company_id && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/dashboard/${workspaceId}/nexusintel/companies/${report.company_id}`}>Open in CRM</Link>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={placeholder("PDF export")}>
            <FileDown className="h-4 w-4" /> Export PDF
          </Button>
          <Button size="sm" variant="outline" onClick={placeholder("Google Sheets export")}>
            <Sheet className="h-4 w-4" /> Export to Sheets
          </Button>
          <Button size="sm" variant="outline" onClick={placeholder("Google Doc creation")}>
            <FileText className="h-4 w-4" /> Create Google Doc
          </Button>
          <Button size="sm" variant="outline" onClick={placeholder("Proposal generation")}>
            Generate Proposal
          </Button>
        </div>
        <ReportView report={report.report_json} />
      </div>
    </DashboardLayout>
  );
}
