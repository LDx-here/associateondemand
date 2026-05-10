# Deployment Guide — Recover My Value

## Vercel Deployment

### Prerequisites
1. A Vercel account at [vercel.com](https://vercel.com)
2. The GitHub repository connected to Vercel
3. All environment variables configured in Vercel dashboard

### Steps
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `associateondemand` GitHub repository
3. Set the **Root Directory** to the project root
4. Vercel will auto-detect the build settings from `vercel.json`
5. Add all environment variables (see below)
6. Click **Deploy**

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL/TiDB connection string | `mysql://user:pass@host:port/db` |
| `JWT_SECRET` | Session cookie signing secret | Random 32+ character string |
| `VITE_APP_ID` | Manus OAuth application ID | From Manus settings |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL | `https://manus.im/login` |
| `OWNER_OPEN_ID` | Owner's Manus OpenID | From Manus settings |
| `AIRTABLE_PAT` | Airtable Personal Access Token | `pat...` |
| `AIRTABLE_BASE_ID` | Airtable Base ID | `app...` |
| `RMV_WEBHOOK_SECRET` | Webhook authentication secret | Random string |
| `GMAIL_NOTIFICATION_EMAIL` | Lead notification email | `support@recovermyvalue.com` |
| `BUILT_IN_FORGE_API_URL` | Manus notification service URL | From Manus |
| `BUILT_IN_FORGE_API_KEY` | Manus notification service key | From Manus |

### Webhook Configuration

Once deployed, your inbound webhook URL will be:

```
POST https://your-domain.vercel.app/api/webhooks/inbound-lead
```

Include the webhook secret in the `x-webhook-secret` header or as a Bearer token in the `Authorization` header.

### Example Webhook Payload

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "state": "Ohio",
  "practiceArea": "Property Damage",
  "inquiryType": "strategy",
  "description": "Called about diminished value claim",
  "source": "ai-receptionist",
  "newsletterOptIn": false
}
```

### Custom Domain

After deployment, configure your custom domain `recovermyvalue.com` in Vercel:
1. Go to Project Settings > Domains
2. Add `recovermyvalue.com`
3. Update DNS records as instructed by Vercel
