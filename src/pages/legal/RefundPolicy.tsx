import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "overview", label: "Overview" },
  { id: "free-trial", label: "Free Trial" },
  { id: "cancellation", label: "Cancellation" },
  { id: "refunds", label: "Refund Eligibility" },
  { id: "how-to", label: "How to Request a Refund" },
  { id: "exceptions", label: "Exceptions" },
  { id: "contact", label: "Contact" },
];

const RefundPolicy = () => (
  <LegalLayout title="Refund Policy" lastUpdated="21 February 2026" toc={toc}>
    <section id="overview">
      <h2>1. Overview</h2>
      <p>NexusFlo24 wants you to be satisfied with our Service. This policy explains how cancellations and refunds work for our subscription plans. All payments are processed securely through Stripe — we do not store your full card details.</p>
    </section>

    <section id="free-trial">
      <h2>2. Free Trial</h2>
      <p>We offer a 14-day free trial on eligible plans. No credit card is required to start a trial. You will not be charged unless you actively choose to subscribe after the trial period ends.</p>
    </section>

    <section id="cancellation">
      <h2>3. Cancellation</h2>
      <ul>
        <li>You may cancel your subscription at any time from your dashboard settings.</li>
        <li>Cancellation takes effect at the end of your current billing period — you will retain access until then.</li>
        <li>No partial refunds are issued for unused time within a billing period.</li>
        <li>Annual subscriptions may be cancelled but are not prorated unless otherwise specified.</li>
      </ul>
    </section>

    <section id="refunds">
      <h2>4. Refund Eligibility</h2>
      <p>Refunds may be considered in the following circumstances:</p>
      <ul>
        <li>You were charged after cancelling your subscription due to a billing error</li>
        <li>You experienced a significant, documented service outage that prevented use of the platform</li>
        <li>You were double-charged or incorrectly charged</li>
      </ul>
      <p>Refund requests must be submitted within 14 days of the disputed charge.</p>
    </section>

    <section id="how-to">
      <h2>5. How to Request a Refund</h2>
      <p>To request a refund, email <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a> with:</p>
      <ul>
        <li>Your account email address</li>
        <li>The date and amount of the charge in question</li>
        <li>A brief description of the reason for the request</li>
      </ul>
      <p>We aim to respond to all refund requests within 5 business days. Approved refunds are processed through Stripe and typically appear on your statement within 5–10 business days.</p>
    </section>

    <section id="exceptions">
      <h2>6. Exceptions</h2>
      <ul>
        <li>Refunds are not available for accounts terminated due to violation of our Terms of Service or Acceptable Use Policy.</li>
        <li>Refunds are not available for services already rendered (e.g., SMS/WhatsApp messages already sent).</li>
        <li>Promotional or discounted plans may have different refund terms as specified at the time of purchase.</li>
      </ul>
    </section>

    <section id="contact">
      <h2>7. Contact</h2>
      <p>For billing questions or refund requests, contact <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a>.</p>
    </section>
  </LegalLayout>
);

export default RefundPolicy;
