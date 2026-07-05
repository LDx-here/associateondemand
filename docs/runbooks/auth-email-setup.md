# Fix: "Error sending magic link email" (Supabase Auth)

Applies to any Supabase Auth email failure with wording like:
- `Error sending magic link email`
- `Error sending confirmation email`
- `Error sending recovery email` (password reset)

**Root cause (99% of the time): this is a Supabase project mail-delivery
setting, not an AssociateOnDemand bug.** GoTrue (Supabase Auth) throws this
exact wrapper message whenever it fails to hand the email off to a mail
server — either because custom SMTP isn't configured yet, or because it *is*
configured but the credentials/sender domain are wrong.

Confirmed **not** the cause on `aod-next.vercel.app` (checked 2026-07-04):
- Vercel Production has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  and `AOD_AUTH_ENABLED` all set (`vercel env ls production`) — the web app
  is not silently falling back to "Supabase not configured."
- `/login` returns `200` and `/dashboard` correctly redirects `307` to
  `/login?next=%2Fdashboard`, so the auth gate itself is wired up.

That narrows it to the Supabase project's own mail configuration.

If the UI shows the nested message:

> Failed to send magic link: Failed to make POST request to
> `.../auth/v1/magiclink` … Error sending magic link email

…ignore the outer wrapper. Go straight to **Auth Logs** (below) — the `error`
field on that row is the only line that tells you what to fix.

### Auth Logs decision tree

| Auth Log `error` (or substring) | Meaning | Fix |
|----------------------------------|---------|-----|
| `535` / `Authentication Failed` / `Invalid login` | Wrong SMTP password or username | Username must be literal `resend`; password = full Resend API key (`re_…`, Sending access). Regenerate key, paste, Save. |
| `550` / `sender` / `not verified` / `domain` | Sender not on a verified Resend domain | Resend → Domains → **Verified**; Supabase sender = `name@that-domain.com`. Not `@gmail.com`, not `@supabase.co`. |
| `rate limit` / `email rate limit exceeded` | Built-in Supabase mailer still active, or limit too low | Enable **Custom SMTP** (Step 2). After Resend works, raise Auth rate limits. |
| `connection refused` / `timeout` / `dial tcp` | Wrong host/port or network block | Host `smtp.resend.com`, port **465** (SSL). Not 587 unless you know STARTTLS is required. |
| `Error sending magic link email` only (no SMTP detail) | Custom SMTP off, or Save failed silently | Re-open SMTP Settings — confirm toggle **on**, all fields filled, click **Save**, retry magic link, re-read Auth Logs. |
| Resend test: `onboarding@resend.dev` | Free tier without verified domain | That sender only delivers to **your Resend account email**. Verify a domain for production sign-in. |

---

## Step 1 — Read the real error (2 minutes)

The login page shows a generic message; the *actual* SMTP/provider error is
only in Supabase's logs.

1. Open the Supabase dashboard → your project → **Logs** → **Auth Logs**
   (or `Authentication` → `Logs`).
2. Find the failed request around the time you tried to sign in
   (`POST /auth/v1/magiclink` or `/auth/v1/otp`).
3. Read the `error` field. It will say one of:
   - `"...: 535 Authentication Failed"` → wrong SMTP username/password
   - `"...: 550 ... not verified"` / `"...domain not verified"` → sender
     address/domain not verified with the SMTP provider
   - `"...dial tcp ...: connection refused/timeout"` → wrong host/port
   - Nothing configured yet (Custom SMTP toggle is off) → you're hitting the
     built-in mailer's **2 emails/hour** limit instead (different error,
     contains "rate limit" — already handled with its own message on the
     login page)

## Step 2 — Configure Resend as custom SMTP (attorney checklist)

Do this once. It fixes magic link, password reset, and any future
"Error sending ... email" for good.

**In Resend (resend.com):**
1. Sign in (or create a free account) at [resend.com](https://resend.com).
2. **Domains** → **Add Domain** → enter the firm's sending domain (e.g.
   `associateondemand.com` or a subdomain like `mail.associateondemand.com`).
   *Do not use a Gmail/personal address as the sender — it will be rejected
   or heavily rate-limited.*
3. Add the DNS records Resend shows (SPF, DKIM, and optionally DMARC) at
   your domain registrar. Wait for the domain status to show **Verified**
   (usually minutes, can take up to a few hours for DNS propagation).
4. **API Keys** → **Create API Key** → Sending access → copy the key
   (starts with `re_`). Treat it as a secret — do not paste it into GitHub,
   Slack, or this repo.

**In Supabase (supabase.com/dashboard → your project):**
1. Go to **Authentication** → **Settings** → **SMTP Settings** (in newer
   dashboards: **Authentication** → **Sign In / Providers** → **SMTP Provider Settings**).
2. Toggle **Enable Custom SMTP** on.
3. Fill in exactly:

   | Field | Value |
   |---|---|
   | Sender email | `noreply@your-verified-domain.com` (must be on the domain you verified in Resend) |
   | Sender name | `AssociateOnDemand` (or firm name) |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` (literal string, not your email) |
   | Password | the Resend API key from Step 2.4 (`re_...`) |

4. Click **Save**.
5. Go to **Authentication** → **URL Configuration** and confirm:
   - **Site URL** = `https://aod-next.vercel.app`
   - **Redirect URLs** includes `https://aod-next.vercel.app/auth/callback`
     (and, for local dev, `http://localhost:3003/auth/callback`)
6. (Optional but recommended) **Authentication** → **Rate Limits** → raise
   the email send rate limit above the default 3/hour now that you have
   dedicated SMTP — the default is sized for the built-in mailer, not Resend.

## Step 3 — Verify the fix

1. In an incognito window, go to `https://aod-next.vercel.app/login`.
2. Enter your email, click **Use email magic link instead**, then
   **Send magic link**.
3. Expect: green "Check your email for a sign-in link" message, and the
   email arrives within ~30 seconds (check spam the first time).
4. If it still fails, re-check **Auth Logs** (Step 1) — the error will now
   show the *specific* SMTP rejection reason (bad credentials, unverified
   sender, etc.) rather than a generic failure.

## Fallback while SMTP is being fixed

Password sign-in does **not** send an email and is unaffected by SMTP
issues. On the login page, click **"Use email and password instead."** If
no password is set yet for your account, an admin can set one directly:
**Supabase Dashboard → Authentication → Users → (your user) → Reset password**
(sets it without sending mail), or **... → Send magic link** replaced by
manually copying the generated link from Auth Logs as a last resort.

## Code-side change landed alongside this doc

`web/src/lib/supabase/auth-errors.ts` now recognizes the
`Error sending ... email` family of Supabase errors specifically (previously
fell through to Supabase's raw, unhelpful wrapper text) and tells the user to
try password sign-in and points admins at this runbook. No other app code
change is needed — env vars in Vercel Production are already correct.

## Related

- [phase-7-deploy-checklist.md](./phase-7-deploy-checklist.md) — initial Supabase/Vercel setup
- [deploy.md](./deploy.md) — full production architecture
- `web/src/lib/supabase/auth-errors.ts` — error copy shown on `/login`
