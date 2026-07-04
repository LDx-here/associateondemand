/** Map Supabase Auth errors to actionable copy for the login UI. */
export function formatAuthError(message: string): string {
  if (/rate limit/i.test(message)) {
    return (
      "Supabase email rate limit reached (default mailer allows only a few auth emails per hour). " +
      "Wait about an hour before trying again, set a password in Supabase Dashboard → Authentication → Users, " +
      "or configure custom SMTP under Authentication → SMTP Settings."
    );
  }
  if (/error sending.*email/i.test(message)) {
    return (
      "We couldn’t send that email — the sign-in mail service is misconfigured or down (Supabase SMTP). " +
      "If you already have a password, use “Use email and password instead” below. Otherwise, ask your " +
      "admin to fix Authentication → SMTP Settings in Supabase (see docs/runbooks/auth-email-setup.md)."
    );
  }
  if (/not authorized|invalid email/i.test(message)) {
    return (
      "This email may not be allowed on Supabase’s default mailer. Add your address to the Supabase " +
      "organization team, or configure custom SMTP under Authentication → SMTP Settings."
    );
  }
  return message;
}
