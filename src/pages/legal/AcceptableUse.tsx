import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "overview", label: "Overview" },
  { id: "prohibited", label: "Prohibited Activities" },
  { id: "messaging", label: "Messaging & Campaign Rules" },
  { id: "content", label: "Content Standards" },
  { id: "enforcement", label: "Enforcement" },
  { id: "reporting", label: "Reporting Violations" },
];

const AcceptableUse = () => (
  <LegalLayout title="Acceptable Use Policy" lastUpdated="21 February 2026" toc={toc}>
    <section id="overview">
      <h2>1. Overview</h2>
      <p>This Acceptable Use Policy ("AUP") outlines the rules and restrictions governing your use of the NexusFlo24 platform. By using our Service, you agree to comply with this AUP in addition to our Terms of Service.</p>
    </section>

    <section id="prohibited">
      <h2>2. Prohibited Activities</h2>
      <p>You must not use NexusFlo24 to:</p>
      <ul>
        <li>Send unsolicited messages (spam), including email, SMS, or WhatsApp messages to recipients who have not opted in</li>
        <li>Distribute malware, viruses, or other harmful software</li>
        <li>Engage in phishing, fraud, or deceptive practices</li>
        <li>Violate any applicable law or regulation</li>
        <li>Infringe on intellectual property rights of others</li>
        <li>Harass, threaten, or abuse any individual or group</li>
        <li>Attempt to gain unauthorised access to other accounts or systems</li>
        <li>Circumvent usage limits, rate limits, or security measures</li>
        <li>Resell or redistribute the Service without authorisation</li>
        <li>Use the platform for any activity involving regulated industries without proper compliance</li>
      </ul>
    </section>

    <section id="messaging">
      <h2>3. Messaging & Campaign Rules</h2>
      <ul>
        <li>All marketing messages must be sent only to contacts who have provided valid, documented consent</li>
        <li>Every email must include a clear and functional unsubscribe mechanism</li>
        <li>SMS and WhatsApp messages must comply with relevant regulations (PECR, TCPA, carrier guidelines)</li>
        <li>You must honour unsubscribe and opt-out requests within 24 hours</li>
        <li>You must not use misleading sender names, subject lines, or message content</li>
        <li>Purchased, rented, or scraped contact lists are strictly prohibited</li>
      </ul>
    </section>

    <section id="content">
      <h2>4. Content Standards</h2>
      <p>Content created, uploaded, or distributed through NexusFlo24 must not contain:</p>
      <ul>
        <li>Illegal, defamatory, or obscene material</li>
        <li>Content that promotes violence, discrimination, or hatred</li>
        <li>Misleading health claims or unverified financial advice</li>
        <li>Content designed to deceive or manipulate recipients</li>
      </ul>
    </section>

    <section id="enforcement">
      <h2>5. Enforcement</h2>
      <p>Violations of this AUP may result in:</p>
      <ul>
        <li>A warning and request to cease the violating activity</li>
        <li>Temporary suspension of your account or specific features</li>
        <li>Permanent termination of your account</li>
        <li>Reporting to relevant law enforcement or regulatory authorities</li>
      </ul>
      <p>We reserve the right to investigate and take action at our sole discretion.</p>
    </section>

    <section id="reporting">
      <h2>6. Reporting Violations</h2>
      <p>If you believe a NexusFlo24 user is violating this policy, please report it to <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a>.</p>
    </section>
  </LegalLayout>
);

export default AcceptableUse;
