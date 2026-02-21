import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "commitment", label: "Our Commitment" },
  { id: "infrastructure", label: "Infrastructure Security" },
  { id: "data-protection", label: "Data Protection" },
  { id: "access", label: "Access Controls" },
  { id: "payments", label: "Payment Security" },
  { id: "monitoring", label: "Monitoring & Incident Response" },
  { id: "disclosure", label: "Responsible Disclosure" },
  { id: "contact", label: "Contact" },
];

const Security = () => (
  <LegalLayout title="Security" lastUpdated="21 February 2026" toc={toc}>
    <section id="commitment">
      <h2>1. Our Commitment</h2>
      <p>Security is a top priority at NexusFlo24. We implement industry-standard technical and organisational measures to protect your data and ensure the integrity, confidentiality, and availability of our platform.</p>
    </section>

    <section id="infrastructure">
      <h2>2. Infrastructure Security</h2>
      <ul>
        <li>Hosted on enterprise-grade cloud infrastructure with SOC 2 and ISO 27001 certified providers</li>
        <li>All data is encrypted in transit using TLS 1.2+ and at rest using AES-256 encryption</li>
        <li>Regular infrastructure patching and vulnerability scanning</li>
        <li>DDoS protection and web application firewall (WAF)</li>
        <li>Automated backups with point-in-time recovery</li>
      </ul>
    </section>

    <section id="data-protection">
      <h2>3. Data Protection</h2>
      <ul>
        <li>Row-level security ensuring data isolation between workspaces</li>
        <li>Passwords are hashed using industry-standard algorithms (bcrypt)</li>
        <li>Sensitive data is encrypted at the application layer where appropriate</li>
        <li>Regular data protection impact assessments</li>
      </ul>
    </section>

    <section id="access">
      <h2>4. Access Controls</h2>
      <ul>
        <li>Role-based access control (RBAC) for team workspaces</li>
        <li>Principle of least privilege for internal access</li>
        <li>Multi-factor authentication available for user accounts</li>
        <li>Session management with automatic timeout</li>
        <li>Detailed audit logs for administrative actions</li>
      </ul>
    </section>

    <section id="payments">
      <h2>5. Payment Security</h2>
      <p>All payment processing is handled by Stripe, a PCI DSS Level 1 certified payment processor. NexusFlo24 never stores, processes, or has access to your full credit card numbers. Payment data is transmitted directly to Stripe using their secure, tokenised integration.</p>
    </section>

    <section id="monitoring">
      <h2>6. Monitoring & Incident Response</h2>
      <ul>
        <li>24/7 infrastructure monitoring and alerting</li>
        <li>Documented incident response procedures</li>
        <li>Security incident notification within 72 hours as required by GDPR</li>
        <li>Post-incident reviews and remediation</li>
      </ul>
    </section>

    <section id="disclosure">
      <h2>7. Responsible Disclosure</h2>
      <p>If you discover a security vulnerability in NexusFlo24, we encourage responsible disclosure. Please report vulnerabilities to <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a> with a detailed description. We ask that you:</p>
      <ul>
        <li>Do not exploit the vulnerability beyond what is necessary to demonstrate it</li>
        <li>Do not access or modify data belonging to other users</li>
        <li>Allow us reasonable time to investigate and remediate before public disclosure</li>
      </ul>
      <p>We appreciate security researchers who help us keep NexusFlo24 safe.</p>
    </section>

    <section id="contact">
      <h2>8. Contact</h2>
      <p>For security-related questions or to report a vulnerability:<br />Email: <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a><br />Subject line: "Security Report"</p>
    </section>
  </LegalLayout>
);

export default Security;
