import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";

interface TOCItem {
  id: string;
  label: string;
}

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  toc: TOCItem[];
  children: React.ReactNode;
}

const LegalLayout = ({ title, lastUpdated, toc, children }: LegalLayoutProps) => (
  <Layout>
    <section className="py-16 md:py-24">
      <div className="container max-w-3xl bg-slate-200">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        {/* Table of Contents */}
        <nav className="mt-8 rounded-lg border bg-muted/30 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contents</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-accent hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Content */}
        <div className="legal-content mt-10 space-y-8 text-sm leading-relaxed text-foreground/80 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:text-accent [&_a]:underline">
          {children}
        </div>

        <div className="mt-16 border-t pt-6 text-xs text-muted-foreground">
          <p>If you have questions about this policy, contact us at{" "}
            <a href="mailto:support@nexusflo24.com" className="text-accent hover:underline">support@nexusflo24.com</a>.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/privacy-policy" className="hover:text-accent">Privacy</Link>
            <Link to="/terms-of-service" className="hover:text-accent">Terms</Link>
            <Link to="/cookie-policy" className="hover:text-accent">Cookies</Link>
            <Link to="/refund-policy" className="hover:text-accent">Refunds</Link>
            <Link to="/security" className="hover:text-accent">Security</Link>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default LegalLayout;
