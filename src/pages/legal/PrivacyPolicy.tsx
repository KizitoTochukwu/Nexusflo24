import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "who", label: "Who We Are" },
  { id: "data-collect", label: "Data We Collect" },
  { id: "lawful-basis", label: "Lawful Basis for Processing" },
  { id: "how-use", label: "How We Use Your Data" },
  { id: "sharing", label: "Data Sharing & Processors" },
  { id: "transfers", label: "International Data Transfers" },
  { id: "retention", label: "Data Retention" },
  { id: "your-rights", label: "Your Rights" },
  { id: "cookies", label: "Cookies & Tracking" },
  { id: "children", label: "Children's Privacy" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

const PrivacyPolicy = () => (
  <LegalLayout title="Privacy Policy" lastUpdated="21 February 2026" toc={toc}>
    <section id="who">
      <h2>1. Who We Are</h2>
      <p>NexusFlo24 ("we", "us", "our") is an AI-powered marketing automation platform. Our registered address is [ADD BUSINESS ADDRESS]. For GDPR purposes, NexusFlo24 is the data controller of personal data collected through this website and platform.</p>
    </section>

    <section id="data-collect">
      <h2>2. Data We Collect</h2>
      <h3>Account Data</h3>
      <ul>
        <li>Name, email address, company name</li>
        <li>Password (hashed and encrypted)</li>
        <li>Profile information you provide</li>
      </ul>
      <h3>Usage Data</h3>
      <ul>
        <li>Pages visited, features used, click events</li>
        <li>Device type, browser, IP address, approximate location</li>
        <li>Log data and timestamps</li>
      </ul>
      <h3>Marketing Data</h3>
      <ul>
        <li>Contact lists and lead data you upload or create</li>
        <li>Campaign content, email templates, and automation configurations</li>
        <li>AI-generated copy and funnel content</li>
      </ul>
      <h3>Payment Data</h3>
      <ul>
        <li>Billing name, email, and address</li>
        <li>Subscription plan and transaction history</li>
        <li>Payment processing is handled by Stripe — we never store full card details</li>
      </ul>
    </section>

    <section id="lawful-basis">
      <h2>3. Lawful Basis for Processing</h2>
      <p>We process your personal data under the following lawful bases (UK/EU GDPR):</p>
      <ul>
        <li><strong>Contract:</strong> To provide and manage our services, process your subscription, and deliver platform features.</li>
        <li><strong>Legitimate Interest:</strong> To improve our product, prevent fraud, ensure security, and send service-related communications.</li>
        <li><strong>Consent:</strong> For marketing communications, cookie tracking, and optional analytics. You may withdraw consent at any time.</li>
        <li><strong>Legal Obligation:</strong> To comply with tax, accounting, and regulatory requirements.</li>
      </ul>
    </section>

    <section id="how-use">
      <h2>4. How We Use Your Data</h2>
      <ul>
        <li>Provide, maintain, and improve the NexusFlo24 platform</li>
        <li>Process payments and manage your subscription</li>
        <li>Send transactional emails (receipts, alerts, product updates)</li>
        <li>Send marketing communications (with your consent)</li>
        <li>Generate AI-powered copy and campaign suggestions</li>
        <li>Analyse usage patterns to improve features</li>
        <li>Prevent fraud and enforce our terms</li>
      </ul>
    </section>

    <section id="sharing">
      <h2>5. Data Sharing & Processors</h2>
      <p>We do not sell your personal data. We share data with trusted sub-processors only as necessary to operate our service:</p>
      <ul>
        <li><strong>Stripe:</strong> Payment processing</li>
        <li><strong>Cloud infrastructure providers:</strong> Hosting and database services</li>
        <li><strong>AI model providers:</strong> To generate copy and suggestions (data is not used to train third-party models)</li>
        <li><strong>Email delivery services:</strong> Transactional and campaign emails</li>
        <li><strong>Analytics providers:</strong> Anonymised usage analytics</li>
      </ul>
    </section>

    <section id="transfers">
      <h2>6. International Data Transfers</h2>
      <p>Some of our sub-processors operate outside the UK/EEA. Where data is transferred internationally, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs), adequacy decisions, or equivalent protections as required by the UK GDPR.</p>
    </section>

    <section id="retention">
      <h2>7. Data Retention</h2>
      <ul>
        <li><strong>Account data:</strong> Retained while your account is active, and for up to 30 days after deletion request.</li>
        <li><strong>Usage data:</strong> Retained for up to 26 months for analytics purposes.</li>
        <li><strong>Marketing data (leads, campaigns):</strong> Retained while your account is active. Deleted upon account closure.</li>
        <li><strong>Payment records:</strong> Retained for 7 years as required by UK tax law.</li>
      </ul>
    </section>

    <section id="your-rights">
      <h2>8. Your Rights</h2>
      <p>Under UK/EU GDPR, you have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Rectify inaccurate data</li>
        <li>Erase your data ("right to be forgotten")</li>
        <li>Restrict or object to processing</li>
        <li>Data portability (receive your data in a structured format)</li>
        <li>Withdraw consent at any time</li>
        <li>Lodge a complaint with the ICO (UK) or your local supervisory authority</li>
      </ul>
      <p>To exercise your rights, email <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a>.</p>
    </section>

    <section id="cookies">
      <h2>9. Cookies & Tracking</h2>
      <p>We use cookies and similar technologies to operate the platform, remember your preferences, and analyse usage. See our <a href="/cookie-policy">Cookie Policy</a> for full details and how to manage your preferences.</p>
    </section>

    <section id="children">
      <h2>10. Children's Privacy</h2>
      <p>NexusFlo24 is not intended for use by individuals under 18 years of age. We do not knowingly collect personal data from children.</p>
    </section>

    <section id="changes">
      <h2>11. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or an in-app notice. The "Last updated" date at the top reflects the most recent revision.</p>
    </section>

    <section id="contact">
      <h2>12. Contact Us</h2>
      <p>NexusFlo24<br />[ADD BUSINESS ADDRESS]<br />Email: <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a></p>
    </section>
  </LegalLayout>
);

export default PrivacyPolicy;
