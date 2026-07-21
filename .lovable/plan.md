The repeated “invalid provider credentials” notifications are coming from email send attempts that are failing with: **API key is invalid**.

What this means:
- NexusFlo24 is trying to send email through the app’s configured email provider path, but the provider credential being used is invalid.
- Your screenshot matches the existing in-app alert that is created when email sending fails with a credential/auth error.
- Separately, the sender domain **support.nexusflo24.com** is currently marked **drifted**: it was verified before, but DNS verification is no longer passing.

Likely root causes:
1. The saved email provider key is invalid, revoked, or no longer accepted.
2. The app still has older/custom Resend-style email channel settings being used by some send flows.
3. The email sender domain DNS delegation has drifted, which can also prevent reliable branded sending.

Recommended fix plan:
1. Inspect the current email sending code paths and settings UI to find which flow is still using the invalid provider credential.
2. Make the email failure message clearer in the dashboard so it says exactly whether the issue is an invalid provider key, sender-domain DNS drift, or both.
3. If the project should use Lovable’s built-in email sending, remove/disable the stale custom provider dependency from app email paths.
4. If you intentionally want to keep Resend/custom email, update the saved provider credential in Settings → Channels → Email.
5. Correct the DNS delegation for **support.nexusflo24.com** at your domain provider, then re-verify it in Cloud → Emails.

Before I implement changes, please confirm which direction you want:
- **Use built-in Lovable Emails only** and stop relying on custom Resend credentials, or
- **Keep Resend/custom email** and improve the app’s credential validation/error guidance.