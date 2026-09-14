# Fix the "Forgot password" 404

## What's wrong

The "Forgot password?" link on the sign-in screen points to a page that was never built, so users land on the 404 screen. The page that lets someone choose a new password after clicking the email link is also missing — even if a reset email were sent, the link would fail.

## What I'll build

1. **Forgot password page** — matching the existing sign-in design (logo, card, gold button):
   - Email field, "Send reset link" button.
   - Sends the reset email, then shows a "Check your inbox" confirmation.
   - Links back to sign in.
   - Same confirmation message whether or not the email exists (so accounts can't be probed).

2. **Reset password page** — where the emailed link lands:
   - New password + confirm password, minimum length check.
   - Saves the new password and sends the user to the dashboard.
   - Clear message if the link has expired, with a one-click way to request a new one.

3. Both pages added to the app's routes as public pages.

## Technical notes

- New files `src/pages/ForgotPassword.tsx` and `src/pages/ResetPassword.tsx`, using `AuthLayout`.
- Routes `/forgot-password` and `/reset-password` registered in `src/App.tsx`; `/forgot-password` wrapped in `RedirectIfAuth`, `/reset-password` left public so a recovery session can complete.
- `resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })` — matches the redirect already used in dashboard settings.
- Reset page waits for the recovery session via `onAuthStateChange` / `getSession` before calling `updateUser({ password })`; no `current_password` on the recovery path.
- No database or email-template changes; the branded recovery email template already exists.
