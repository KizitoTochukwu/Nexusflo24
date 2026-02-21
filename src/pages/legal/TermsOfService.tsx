import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "service", label: "Description of Service" },
  { id: "accounts", label: "Accounts & Registration" },
  { id: "subscriptions", label: "Subscriptions & Billing" },
  { id: "user-content", label: "User Content & Responsibility" },
  { id: "ai-content", label: "AI-Generated Content" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "ip", label: "Intellectual Property" },
  { id: "limitation", label: "Limitation of Liability" },
  { id: "termination", label: "Termination" },
  { id: "governing-law", label: "Governing Law" },
  { id: "changes", label: "Changes to Terms" },
  { id: "contact", label: "Contact" },
];

const TermsOfService = () => (
  <LegalLayout title="Terms of Service" lastUpdated="21 February 2026" toc={toc}>
    <section id="acceptance">
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using NexusFlo24 ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Service. These Terms constitute a legally binding agreement between you and NexusFlo24.</p>
    </section>

    <section id="service">
      <h2>2. Description of Service</h2>
      <p>NexusFlo24 is an AI-powered marketing automation platform offering CRM, email automation, WhatsApp marketing, Bulk SMS, funnel building, AI copywriting, analytics, and subscription billing via Stripe. The Service is provided "as is" and may be updated, modified, or discontinued at our discretion.</p>
    </section>

    <section id="accounts">
      <h2>3. Accounts & Registration</h2>
      <ul>
        <li>You must provide accurate and complete information when creating an account.</li>
        <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
        <li>You must notify us immediately of any unauthorised access to your account.</li>
        <li>One person or legal entity per account unless you have a team/workspace plan.</li>
      </ul>
    </section>

    <section id="subscriptions">
      <h2>4. Subscriptions & Billing</h2>
      <ul>
        <li>Paid plans are billed on a recurring basis (monthly or annual) via Stripe.</li>
        <li>All fees are exclusive of applicable taxes unless stated otherwise.</li>
        <li>You authorise us to charge your payment method on file for all applicable fees.</li>
        <li>Subscriptions auto-renew unless cancelled before the end of the current billing period.</li>
        <li>Downgrades or cancellations take effect at the end of the current billing cycle.</li>
        <li>We reserve the right to change pricing with 30 days' notice.</li>
      </ul>
      <p>See our <a href="/refund-policy">Refund Policy</a> for details on cancellations and refunds.</p>
    </section>

    <section id="user-content">
      <h2>5. User Content & Responsibility</h2>
      <ul>
        <li>You retain ownership of all content you upload, create, or import ("User Content").</li>
        <li>You grant NexusFlo24 a limited licence to process User Content solely to provide the Service.</li>
        <li>You are solely responsible for ensuring your contact lists have valid consent for marketing communications.</li>
        <li>You must comply with all applicable laws regarding your campaign content, including GDPR, PECR, CAN-SPAM, and local regulations.</li>
        <li>You must not upload data you do not have the right to use.</li>
      </ul>
    </section>

    <section id="ai-content">
      <h2>6. AI-Generated Content</h2>
      <p>NexusFlo24 provides AI-powered copywriting and content suggestions. You acknowledge and agree that:</p>
      <ul>
        <li>AI-generated content is provided as a starting point and may require review and editing.</li>
        <li>You are solely responsible for reviewing, approving, and publishing any AI-generated output.</li>
        <li>NexusFlo24 does not guarantee the accuracy, legality, or suitability of AI-generated content.</li>
        <li>You are responsible for ensuring all published content complies with applicable laws and regulations.</li>
      </ul>
    </section>

    <section id="acceptable-use">
      <h2>7. Acceptable Use</h2>
      <p>You agree not to use the Service to send unsolicited messages (spam), distribute malware, infringe intellectual property, or engage in any unlawful activity. See our full <a href="/acceptable-use">Acceptable Use Policy</a> for details.</p>
    </section>

    <section id="ip">
      <h2>8. Intellectual Property</h2>
      <p>All rights, title, and interest in the NexusFlo24 platform, including its software, design, logos, and documentation, are owned by NexusFlo24. Your subscription grants you a limited, non-exclusive, non-transferable licence to use the Service.</p>
    </section>

    <section id="limitation">
      <h2>9. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, NexusFlo24 shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or business opportunities arising from your use of the Service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
    </section>

    <section id="termination">
      <h2>10. Termination</h2>
      <p>We may suspend or terminate your account if you breach these Terms or engage in prohibited activities. You may close your account at any time from your dashboard settings. Upon termination, your data will be deleted in accordance with our <a href="/privacy-policy">Privacy Policy</a>.</p>
    </section>

    <section id="governing-law">
      <h2>11. Governing Law</h2>
      <p>These Terms are governed by and construed in accordance with the laws of the United Kingdom. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
    </section>

    <section id="changes">
      <h2>12. Changes to Terms</h2>
      <p>We may update these Terms from time to time. We will notify you of material changes via email or an in-app notice at least 30 days before they take effect. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
    </section>

    <section id="contact">
      <h2>13. Contact</h2>
      <p>NexusFlo24<br />[ADD BUSINESS ADDRESS]<br />Email: <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a></p>
    </section>
  </LegalLayout>
);

export default TermsOfService;
