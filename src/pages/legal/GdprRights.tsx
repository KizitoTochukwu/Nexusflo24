import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "overview", label: "Overview" },
  { id: "rights", label: "Your Rights Under GDPR" },
  { id: "exercise", label: "How to Exercise Your Rights" },
  { id: "response", label: "Our Response" },
  { id: "identity", label: "Identity Verification" },
  { id: "complaints", label: "Complaints" },
  { id: "contact", label: "Contact" },
];

const GdprRights = () => (
  <LegalLayout title="GDPR Rights" lastUpdated="21 February 2026" toc={toc}>
    <section id="overview">
      <h2>1. Overview</h2>
      <p>NexusFlo24 is committed to protecting your rights under the UK General Data Protection Regulation (UK GDPR) and EU GDPR. This page explains your data protection rights and how to exercise them.</p>
    </section>

    <section id="rights">
      <h2>2. Your Rights Under GDPR</h2>
      <h3>Right of Access (Article 15)</h3>
      <p>You have the right to obtain confirmation of whether we process your personal data and to request a copy of that data.</p>
      <h3>Right to Rectification (Article 16)</h3>
      <p>You have the right to request correction of inaccurate personal data or completion of incomplete data.</p>
      <h3>Right to Erasure (Article 17)</h3>
      <p>Also known as the "right to be forgotten" — you can request deletion of your personal data when it is no longer necessary for the purposes for which it was collected, or when you withdraw consent.</p>
      <h3>Right to Restrict Processing (Article 18)</h3>
      <p>You can request that we limit how we use your data in certain circumstances, such as when you contest the accuracy of the data.</p>
      <h3>Right to Data Portability (Article 20)</h3>
      <p>You have the right to receive your personal data in a structured, commonly used, machine-readable format and to transmit it to another controller.</p>
      <h3>Right to Object (Article 21)</h3>
      <p>You can object to processing based on legitimate interests or for direct marketing purposes. We will cease processing unless we demonstrate compelling legitimate grounds.</p>
      <h3>Rights Related to Automated Decision-Making (Article 22)</h3>
      <p>You have the right not to be subject to decisions based solely on automated processing that produce legal or similarly significant effects. NexusFlo24 does not currently make such automated decisions.</p>
    </section>

    <section id="exercise">
      <h2>3. How to Exercise Your Rights</h2>
      <p>To exercise any of your GDPR rights, please submit a request to:</p>
      <ul>
        <li>Email: <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a></li>
        <li>Subject line: "GDPR Rights Request"</li>
      </ul>
      <p>Please include:</p>
      <ul>
        <li>Your full name and email address associated with your NexusFlo24 account</li>
        <li>A clear description of the right you wish to exercise</li>
        <li>Any additional information to help us locate and process your request</li>
      </ul>
    </section>

    <section id="response">
      <h2>4. Our Response</h2>
      <ul>
        <li>We will acknowledge your request within 3 business days</li>
        <li>We will respond to your request within 30 days (one calendar month)</li>
        <li>If the request is complex, we may extend this by a further two months, and will inform you of the extension and reasons</li>
        <li>There is no fee for exercising your rights, unless requests are manifestly unfounded or excessive</li>
      </ul>
    </section>

    <section id="identity">
      <h2>5. Identity Verification</h2>
      <p>To protect your privacy, we may need to verify your identity before processing your request. We will ask you to confirm details associated with your account. We will not request unnecessary identification documents.</p>
    </section>

    <section id="complaints">
      <h2>6. Complaints</h2>
      <p>If you are not satisfied with how we handle your request, you have the right to lodge a complaint with your local supervisory authority:</p>
      <ul>
        <li><strong>UK:</strong> Information Commissioner's Office (ICO) — <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a></li>
        <li><strong>EU:</strong> Your local Data Protection Authority (DPA)</li>
      </ul>
    </section>

    <section id="contact">
      <h2>7. Contact</h2>
      <p>NexusFlo24<br />[ADD BUSINESS ADDRESS]<br />Email: <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a></p>
    </section>
  </LegalLayout>
);

export default GdprRights;
