import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "general", label: "General Disclaimer" },
  { id: "ai", label: "AI-Generated Content" },
  { id: "results", label: "No Guarantee of Results" },
  { id: "third-party", label: "Third-Party Services" },
  { id: "professional", label: "Not Professional Advice" },
  { id: "limitation", label: "Limitation" },
];

const Disclaimer = () => (
  <LegalLayout title="Disclaimer" lastUpdated="21 February 2026" toc={toc}>
    <section id="general">
      <h2>1. General Disclaimer</h2>
      <p>The information and services provided by NexusFlo24 are offered on an "as is" and "as available" basis. While we strive to ensure accuracy and reliability, we make no warranties or representations, express or implied, regarding the completeness, accuracy, or suitability of any information or service.</p>
    </section>

    <section id="ai">
      <h2>2. AI-Generated Content</h2>
      <p>NexusFlo24 includes AI-powered features that generate marketing copy, email content, campaign suggestions, and other outputs. You acknowledge that:</p>
      <ul>
        <li>AI-generated content is produced algorithmically and may contain errors, inaccuracies, or inappropriate content</li>
        <li>You are solely responsible for reviewing, editing, and approving all AI-generated output before use</li>
        <li>NexusFlo24 is not responsible for any consequences arising from the use of AI-generated content</li>
        <li>AI outputs should not be relied upon as legal, financial, or professional advice</li>
        <li>You must ensure all published content complies with applicable advertising standards and regulations</li>
      </ul>
    </section>

    <section id="results">
      <h2>3. No Guarantee of Results</h2>
      <p>NexusFlo24 provides tools and automation to support your marketing efforts. However, we do not guarantee specific outcomes, including email open rates, conversion rates, revenue growth, or lead generation results. Results depend on many factors outside our control, including your content, audience, industry, and market conditions.</p>
    </section>

    <section id="third-party">
      <h2>4. Third-Party Services</h2>
      <p>NexusFlo24 integrates with third-party services (Stripe, email providers, messaging platforms). We are not responsible for the availability, performance, or policies of third-party services. Your use of third-party services is governed by their respective terms and privacy policies.</p>
    </section>

    <section id="professional">
      <h2>5. Not Professional Advice</h2>
      <p>Nothing on the NexusFlo24 website or platform constitutes legal, financial, tax, or professional advice. The content provided, including blog posts, academy materials, and documentation, is for informational purposes only. Consult a qualified professional for advice specific to your situation.</p>
    </section>

    <section id="limitation">
      <h2>6. Limitation</h2>
      <p>To the fullest extent permitted by law, NexusFlo24 disclaims all liability for any loss or damage arising from your use of or reliance on the Service, including but not limited to direct, indirect, incidental, or consequential damages.</p>
    </section>
  </LegalLayout>
);

export default Disclaimer;
