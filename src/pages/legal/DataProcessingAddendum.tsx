import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "scope", label: "Scope & Applicability" },
  { id: "definitions", label: "Definitions" },
  { id: "processing", label: "Data Processing Details" },
  { id: "obligations", label: "Processor Obligations" },
  { id: "sub-processors", label: "Sub-Processors" },
  { id: "transfers", label: "International Transfers" },
  { id: "security", label: "Security Measures" },
  { id: "breach", label: "Data Breach Notification" },
  { id: "rights", label: "Data Subject Rights" },
  { id: "audit", label: "Audit Rights" },
  { id: "termination", label: "Termination & Data Return" },
];

const DataProcessingAddendum = () => (
  <LegalLayout title="Data Processing Addendum (DPA)" lastUpdated="21 February 2026" toc={toc}>
    <section id="scope">
      <h2>1. Scope & Applicability</h2>
      <p>This Data Processing Addendum ("DPA") supplements the NexusFlo24 Terms of Service and applies where NexusFlo24 processes personal data on your behalf as a data processor under UK/EU GDPR. This DPA applies to all personal data processed through the NexusFlo24 platform, including lead data, campaign recipients, and analytics data.</p>
    </section>

    <section id="definitions">
      <h2>2. Definitions</h2>
      <ul>
        <li><strong>"Controller"</strong> — You, the NexusFlo24 customer, who determines the purposes and means of processing personal data.</li>
        <li><strong>"Processor"</strong> — NexusFlo24, which processes personal data on behalf of the Controller.</li>
        <li><strong>"Personal Data"</strong> — Any information relating to an identified or identifiable natural person.</li>
        <li><strong>"Processing"</strong> — Any operation performed on personal data (collection, storage, use, disclosure, deletion, etc.).</li>
      </ul>
    </section>

    <section id="processing">
      <h2>3. Data Processing Details</h2>
      <ul>
        <li><strong>Subject matter:</strong> Provision of marketing automation services</li>
        <li><strong>Duration:</strong> For the term of your subscription agreement</li>
        <li><strong>Nature and purpose:</strong> Storage, organisation, and transmission of lead/contact data for CRM, email, SMS, and WhatsApp campaigns</li>
        <li><strong>Categories of data subjects:</strong> Your leads, contacts, and campaign recipients</li>
        <li><strong>Types of personal data:</strong> Names, email addresses, phone numbers, tags, notes, interaction history</li>
      </ul>
    </section>

    <section id="obligations">
      <h2>4. Processor Obligations</h2>
      <p>NexusFlo24 shall:</p>
      <ul>
        <li>Process personal data only on your documented instructions</li>
        <li>Ensure personnel authorised to process data are subject to confidentiality obligations</li>
        <li>Implement appropriate technical and organisational security measures</li>
        <li>Assist you in responding to data subject rights requests</li>
        <li>Assist you with data protection impact assessments where required</li>
        <li>Delete or return personal data upon termination of the agreement</li>
      </ul>
    </section>

    <section id="sub-processors">
      <h2>5. Sub-Processors</h2>
      <p>NexusFlo24 uses sub-processors to deliver the Service. We maintain an up-to-date list of sub-processors and will notify you of any changes. You may object to a new sub-processor within 14 days of notification. Current sub-processors include cloud hosting providers, payment processors (Stripe), and email delivery services.</p>
    </section>

    <section id="transfers">
      <h2>6. International Transfers</h2>
      <p>Where personal data is transferred outside the UK/EEA, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the UK ICO or European Commission, or reliance on an adequacy decision.</p>
    </section>

    <section id="security">
      <h2>7. Security Measures</h2>
      <p>NexusFlo24 implements industry-standard security measures including encryption at rest and in transit, access controls, regular security assessments, and incident response procedures. See our <a href="/security">Security page</a> for more details.</p>
    </section>

    <section id="breach">
      <h2>8. Data Breach Notification</h2>
      <p>In the event of a personal data breach, NexusFlo24 will notify you without undue delay and no later than 72 hours after becoming aware of the breach. Notification will include the nature of the breach, categories and approximate number of data subjects affected, likely consequences, and measures taken to address and mitigate the breach.</p>
    </section>

    <section id="rights">
      <h2>9. Data Subject Rights</h2>
      <p>NexusFlo24 will assist you in fulfilling your obligations to respond to data subject requests (access, rectification, erasure, portability, restriction, objection) by providing appropriate technical and organisational measures.</p>
    </section>

    <section id="audit">
      <h2>10. Audit Rights</h2>
      <p>You may audit NexusFlo24's compliance with this DPA by requesting our most recent security certifications, audit reports, or by conducting a reasonable audit with at least 30 days' written notice. Audits shall be conducted during normal business hours and at your expense.</p>
    </section>

    <section id="termination">
      <h2>11. Termination & Data Return</h2>
      <p>Upon termination of our agreement, NexusFlo24 will, at your choice, return or delete all personal data processed on your behalf within 30 days, unless retention is required by applicable law.</p>
    </section>
  </LegalLayout>
);

export default DataProcessingAddendum;
