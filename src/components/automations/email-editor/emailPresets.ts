export interface EmailPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  subject: string;
  body: string;
}

export const EMAIL_PRESETS: EmailPreset[] = [
  {
    id: "welcome",
    label: "Welcome",
    emoji: "👋",
    description: "Greet new subscribers and set expectations",
    subject: "Welcome to {{company}}, {{first_name}}!",
    body: `# Welcome aboard, {{first_name}}! 🎉

We're thrilled to have you join us. Here's what you can expect:

• Helpful tips and resources delivered to your inbox
• Exclusive updates and early access to new features
• A dedicated support team ready to help

---

## Getting Started

The best way to get started is to explore your dashboard and set up your first campaign.

If you have any questions, just hit reply — we're always happy to help.

Best regards,
The Team`,
  },
  {
    id: "followup",
    label: "Follow-up",
    emoji: "🔄",
    description: "Re-engage after initial contact or action",
    subject: "Quick follow-up, {{first_name}}",
    body: `Hi {{first_name}},

I wanted to follow up on our recent conversation and see how things are going.

Have you had a chance to:

1. Explore the features we discussed?
2. Set up your first workflow?
3. Connect your tools?

If you need any help or have questions, I'm just a reply away.

---

Looking forward to hearing from you!

Best,
Your Account Manager`,
  },
  {
    id: "promo",
    label: "Promo",
    emoji: "🎁",
    description: "Announce offers, discounts, or launches",
    subject: "🔥 Exclusive offer just for you, {{first_name}}",
    body: `# Don't Miss Out, {{first_name}}!

For a limited time, we're offering an exclusive deal just for our valued subscribers:

## ✨ 30% OFF All Pro Plans

• Unlimited campaigns & automations
• Priority support
• Advanced analytics & reporting

---

This offer expires soon — don't wait!

<a href="https://nexusflo24.com/pricing" style="display:inline-block;background-color:#0B1F3B;color:#ffffff;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Claim Your Discount</a>

---

Have questions? Reply to this email and we'll be happy to help.

Cheers,
The NexusFlo24 Team`,
  },
  {
    id: "reengagement",
    label: "Re-engagement",
    emoji: "💌",
    description: "Win back inactive contacts",
    subject: "We miss you, {{first_name}} 💛",
    body: `Hi {{first_name}},

It's been a while since we last heard from you, and we wanted to check in.

We've been busy building new features that we think you'll love:

• Smarter automation workflows
• Improved analytics dashboard
• New email template builder

---

## Come back and see what's new

We'd love to have you back. If there's anything we can do to improve your experience, just let us know.

<a href="https://nexusflo24.com/dashboard" style="display:inline-block;background-color:#0B1F3B;color:#ffffff;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Visit Your Dashboard</a>

---

If you no longer wish to receive these emails, you can unsubscribe below.

Warm regards,
The NexusFlo24 Team`,
  },
];
