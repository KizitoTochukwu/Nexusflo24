import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "what", label: "What Are Cookies" },
  { id: "types", label: "Types of Cookies We Use" },
  { id: "third-party", label: "Third-Party Cookies" },
  { id: "manage", label: "Managing Your Preferences" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact" },
];

const CookiePolicy = () => (
  <LegalLayout title="Cookie Policy" lastUpdated="21 February 2026" toc={toc}>
    <section id="what">
      <h2>1. What Are Cookies</h2>
      <p>Cookies are small text files placed on your device when you visit a website. They help websites function properly, remember your preferences, and provide analytics data. NexusFlo24 uses cookies and similar technologies (local storage, session storage) to operate our platform.</p>
    </section>

    <section id="types">
      <h2>2. Types of Cookies We Use</h2>
      <h3>Strictly Necessary Cookies</h3>
      <p>Essential for the platform to function. These include authentication tokens, session management, and security cookies. These cannot be disabled.</p>
      <h3>Functional Cookies</h3>
      <p>Remember your preferences such as language, theme, and dashboard layout. These enhance your experience but are not strictly required.</p>
      <h3>Analytics Cookies</h3>
      <p>Help us understand how visitors interact with the platform — pages visited, features used, and performance metrics. Data is aggregated and anonymised where possible.</p>
      <h3>Marketing Cookies</h3>
      <p>Used to track the effectiveness of our advertising campaigns and to deliver relevant content. These are only set with your explicit consent.</p>
    </section>

    <section id="third-party">
      <h2>3. Third-Party Cookies</h2>
      <p>Some cookies may be set by third-party services we use, including:</p>
      <ul>
        <li><strong>Stripe:</strong> Payment security and fraud detection</li>
        <li><strong>Analytics services:</strong> Usage tracking and performance monitoring</li>
      </ul>
      <p>These third parties have their own privacy and cookie policies.</p>
    </section>

    <section id="manage">
      <h2>4. Managing Your Preferences</h2>
      <p>When you first visit NexusFlo24, you'll see a cookie consent banner allowing you to:</p>
      <ul>
        <li><strong>Accept All:</strong> Enable all cookie categories</li>
        <li><strong>Reject Non-Essential:</strong> Only strictly necessary cookies will be used</li>
        <li><strong>Manage Preferences:</strong> Choose which categories to enable</li>
      </ul>
      <p>You can change your preferences at any time by clicking "Cookie Settings" in our website footer. You can also manage cookies through your browser settings, though this may affect site functionality.</p>
    </section>

    <section id="changes">
      <h2>5. Changes to This Policy</h2>
      <p>We may update this Cookie Policy as our use of cookies evolves. Changes will be posted on this page with an updated date.</p>
    </section>

    <section id="contact">
      <h2>6. Contact</h2>
      <p>For questions about our use of cookies, contact us at <a href="mailto:support@nexusflo24.com">support@nexusflo24.com</a>.</p>
    </section>
  </LegalLayout>
);

export default CookiePolicy;
