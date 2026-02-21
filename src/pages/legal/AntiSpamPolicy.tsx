import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "commitment", label: "Our Commitment" },
  { id: "definition", label: "What is Spam" },
  { id: "requirements", label: "Sender Requirements" },
  { id: "consent", label: "Consent Standards" },
  { id: "prohibited", label: "Prohibited Practices" },
  { id: "compliance", label: "Compliance Monitoring" },
  { id: "enforcement", label: "Enforcement" },
  { id: "reporting", label: "Report Spam" },
];

const AntiSpamPolicy = () => (
  <LegalLayout title="Anti-Spam Policy" lastUpdated="21 February 2026" toc={toc}>
    <section id="commitment">
      <h2>1. Our Commitment</h2>
      <p>NexusFlo24 is committed to fighting spam and ensuring all messages sent through our platform comply with applicable anti-spam laws, including the UK Privacy and Electronic Communications Regulations (PECR), EU ePrivacy Directive, CAN-SPAM Act, and CASL.</p>
    </section>

    <section id="definition">
      <h2>2. What is Spam</h2>
      <p>Spam is any unsolicited commercial electronic message sent to recipients who have not given consent to receive it. This includes email, SMS, WhatsApp, and any other messaging channel available through NexusFlo24.</p>
    </section>

    <section id="requirements">
      <h2>3. Sender Requirements</h2>
      <p>All NexusFlo24 users must:</p>
      <ul>
        <li>Only send messages to recipients who have provided valid consent</li>
        <li>Clearly identify themselves as the sender in every message</li>
        <li>Include a valid physical postal address or registered business address</li>
        <li>Provide a clear and easy-to-use unsubscribe/opt-out mechanism in every marketing message</li>
        <li>Process opt-out requests within 24 hours</li>
        <li>Use accurate and non-deceptive subject lines and sender information</li>
      </ul>
    </section>

    <section id="consent">
      <h2>4. Consent Standards</h2>
      <ul>
        <li><strong>Opt-in required:</strong> Recipients must have actively opted in to receive marketing communications from you</li>
        <li><strong>No purchased lists:</strong> Contact lists that are bought, rented, borrowed, or scraped are strictly prohibited</li>
        <li><strong>Record-keeping:</strong> You must maintain records of how and when consent was obtained</li>
        <li><strong>Double opt-in:</strong> Recommended (and required in some jurisdictions) for maximum deliverability and compliance</li>
      </ul>
    </section>

    <section id="prohibited">
      <h2>5. Prohibited Practices</h2>
      <ul>
        <li>Sending bulk unsolicited messages of any kind</li>
        <li>Using false or misleading header information</li>
        <li>Harvesting email addresses from websites or public sources</li>
        <li>Using the platform to distribute malware or phishing content</li>
        <li>Sending messages on behalf of third parties without proper authorisation</li>
        <li>Circumventing sending limits or suppression lists</li>
      </ul>
    </section>

    <section id="compliance">
      <h2>6. Compliance Monitoring</h2>
      <p>NexusFlo24 actively monitors sending patterns to detect potential abuse. We track bounce rates, complaint rates, and unsubscribe rates. Accounts with abnormally high complaint or bounce rates may be flagged for review.</p>
    </section>

    <section id="enforcement">
      <h2>7. Enforcement</h2>
      <p>Violations of this Anti-Spam Policy may result in:</p>
      <ul>
        <li>Immediate suspension of messaging capabilities</li>
        <li>Account suspension or permanent termination</li>
        <li>Reporting to relevant authorities</li>
      </ul>
      <p>Repeat offenders will be permanently banned from the platform.</p>
    </section>

    <section id="reporting">
      <h2>8. Report Spam</h2>
      <p>If you received an unwanted message sent through NexusFlo24, please report it to <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a> with the full message headers and content. We take all reports seriously and will investigate promptly.</p>
    </section>
  </LegalLayout>
);

export default AntiSpamPolicy;
