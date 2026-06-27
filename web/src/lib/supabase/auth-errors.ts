/** Map Supabase Auth errors to actionable copy for the login UI. */
export function formatAuthError(message: string): string {
  if (/rate limit/i.test(message)) {
    return (
      "Supabase email rate limit reached (default mailer allows only a few auth emails per hour). " +
      "Wait about an hour before trying again, set a password in Supabase Dashboard → Authentication → Users, " +
      "or configure custom SMTP under Authentication → SMTP Settings."
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
