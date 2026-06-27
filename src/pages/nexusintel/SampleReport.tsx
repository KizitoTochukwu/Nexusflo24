import Layout from "@/components/layout/Layout";
import ReportView from "@/components/nexusintel/ReportView";
import { generateCompanyIntelligenceReport } from "@/lib/nexusintel/generateReport";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const sample = generateCompanyIntelligenceReport({
  companyName: "Acme Consulting",
  websiteUrl: "https://acmeconsulting.example",
  industry: "Management Consulting",
  location: "London, UK",
  size: "11–50 employees",
  servicesOffer: "Done-for-you marketing automation and lead generation",
  targetCustomerType: "SMB founders and growth leads",
  notes: "Sample only.",
  depth: "standard",
  sections: {
    identity: true, websiteAudit: true, marketing: true, leadGen: true, automation: true,
    competitors: true, techStack: true, decisionMakers: true, outreach: true, followUp: true, dealScore: true,
  },
});

export default function SampleReport() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Badge className="mb-2 bg-accent text-accent-foreground">Sample report</Badge>
            <h1 className="text-3xl font-bold">NexusIntel Intelligence Report</h1>
            <p className="text-muted-foreground">A live preview of what every report looks like.</p>
          </div>
          <Button asChild>
            <Link to="/register?next=/dashboard">Generate your own</Link>
          </Button>
        </div>
        <ReportView report={sample} />
      </div>
    </Layout>
  );
}
