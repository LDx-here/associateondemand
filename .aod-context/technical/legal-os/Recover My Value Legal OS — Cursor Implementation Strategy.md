# Recover My Value Legal OS — Cursor Implementation Strategy

**Author:** Manus AI  
**Date:** July 21, 2026  
**Purpose:** Complete technical blueprint for Cursor to build the RMV Legal OS end-to-end.

---

## 1. Architecture Overview

The RMV Legal OS is a full-stack TypeScript application built on the Manus WebDev template (React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL/TiDB). It uses Manus OAuth for admin authentication, a built-in LLM proxy for AI drafting, S3-compatible storage for documents, and Stripe for payments.

The central concept is the **Matter Engine** — a state machine that tracks every legal matter through eight defined stages and orchestrates specialized AI agents to execute tasks at each stage. The Matter Engine is the single source of truth; agents do not make workflow decisions independently.

**Tech Stack (already scaffolded):**

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, wouter routing |
| Backend | Express 4, tRPC 11, Drizzle ORM |
| Database | MySQL (TiDB) via `DATABASE_URL` env |
| Auth | Manus OAuth (pre-wired) |
| LLM | Built-in proxy (`invokeLLM` from `server/_core/llm.ts`) |
| Storage | S3 via `storagePut` from `server/storage.ts` |
| Payments | Stripe (to be added via `webdev_add_feature`) |
| Scheduling | Heartbeat cron (`server/_core/heartbeat.ts`) |

---

## 2. Execution Order

Cursor should execute these steps **sequentially**. Each step builds on the previous one.

| Step | What to Build | Files to Create/Edit |
|------|--------------|---------------------|
| 1 | Apply database migration | Run `pnpm drizzle-kit generate` then apply SQL |
| 2 | Backend: Matter Engine + CRUD | `server/routers/matters.ts`, `server/db.ts` |
| 3 | Backend: Leads + Intake | `server/routers/leads.ts` |
| 4 | Backend: Conflict Check | `server/routers/conflicts.ts` |
| 5 | Backend: Agents + Tasks | `server/routers/agents.ts` |
| 6 | Backend: Firm Memory | `server/routers/firmMemory.ts` |
| 7 | Backend: Services + Pricing | `server/routers/services.ts` |
| 8 | Backend: LLM Drafting | `server/routers/drafting.ts` |
| 9 | Backend: Clio Integration | `server/routers/clio.ts`, `server/clio.ts` |
| 10 | Backend: File Upload | `server/routers/files.ts` |
| 11 | Backend: Abandoned Session Cron | `server/_core/index.ts` (mount handler) |
| 12 | Frontend: Design System | `client/src/index.css`, `client/index.html` |
| 13 | Frontend: App Routes | `client/src/App.tsx` |
| 14 | Frontend: /associate Landing | `client/src/pages/Associate.tsx` |
| 15 | Frontend: Intake Funnel | `client/src/pages/intake/*` |
| 16 | Frontend: Admin Dashboard | `client/src/pages/admin/*` |
| 17 | Stripe Integration | Use `webdev_add_feature("stripe")` then wire |
| 18 | Tests | `server/*.test.ts` |

---

## 3. Database Schema

The schema is already written in `drizzle/schema.ts`. It defines 14 tables:

| Table | Purpose |
|-------|---------|
| `users` | Manus OAuth users (admin access) |
| `firms` | Client law firms |
| `leads` | Captured leads from intake funnel |
| `matters` | Central Matter Engine — the core table |
| `agents` | Agent Registry (8 agent types) |
| `agent_tasks` | Tasks assigned to agents per matter |
| `firm_memory_profiles` | Per-firm writing style profiles |
| `firm_memory_samples` | Uploaded sample documents for style analysis |
| `documents` | Matter-attached documents |
| `conflict_checks` | Conflict check results |
| `services` | Service catalog with pricing |
| `clio_tokens` | OAuth tokens for Clio integration |
| `clio_webhook_events` | Incoming Clio webhook payloads |
| `llm_task_configs` | Per-task-type LLM model configuration |

**To apply:** Run `pnpm drizzle-kit generate` then execute the generated SQL via `webdev_execute_sql`. The migration file `drizzle/0001_colossal_ghost_rider.sql` is already generated and ready.

---

## 4. Backend Implementation

### 4.1 Router Structure

Split `server/routers.ts` into sub-routers. The main file should import and compose them:

```ts
// server/routers.ts
import { router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { authRouter } from "./routers/auth";
import { mattersRouter } from "./routers/matters";
import { leadsRouter } from "./routers/leads";
import { conflictsRouter } from "./routers/conflicts";
import { agentsRouter } from "./routers/agents";
import { firmMemoryRouter } from "./routers/firmMemory";
import { servicesRouter } from "./routers/services";
import { draftingRouter } from "./routers/drafting";
import { clioRouter } from "./routers/clio";
import { filesRouter } from "./routers/files";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  matters: mattersRouter,
  leads: leadsRouter,
  conflicts: conflictsRouter,
  agents: agentsRouter,
  firmMemory: firmMemoryRouter,
  services: servicesRouter,
  drafting: draftingRouter,
  clio: clioRouter,
  files: filesRouter,
});

export type AppRouter = typeof appRouter;
```

### 4.2 Matter Engine (server/routers/matters.ts)

The Matter Engine is a state machine. The `stage` field on each matter can only transition forward through the defined sequence. Implement a `transitionStage` helper that enforces valid transitions.

**Valid stage transitions:**

```
intake → conflict_check → quote → engagement → drafting → review → delivery → closed
```

A matter can also skip from `intake` directly to `quote` (Quick Upload path where conflict check is deferred).

**Key procedures:**

```ts
// Pseudocode for the matters router
matters: router({
  list: protectedProcedure.query(...)        // List all matters with filters
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(...)
  create: protectedProcedure.input(InsertMatterSchema).mutation(...)
  update: protectedProcedure.input(UpdateMatterSchema).mutation(...)
  transitionStage: protectedProcedure.input(z.object({
    matterId: z.number(),
    targetStage: z.enum([...stages])
  })).mutation(...)   // Validates transition, updates nextAction, assigns agent
  assignAgent: protectedProcedure.input(z.object({
    matterId: z.number(),
    agentId: z.number()
  })).mutation(...)
  getPipeline: protectedProcedure.query(...)  // Returns matters grouped by stage
})
```

**Stage transition logic:** When a matter transitions to a new stage, the Matter Engine must:
1. Validate the transition is legal (forward only, or specific skip rules).
2. Update the `stage` field.
3. Set `nextAction` based on the new stage and matter type.
4. Auto-assign the appropriate agent type for the new stage.
5. Create an `agent_task` record for the assigned agent.
6. Update `status` to reflect the new state.

**Stage-to-Agent mapping:**

| Stage | Default Agent Type | Next Action |
|-------|-------------------|-------------|
| intake | intake | "Process submission and extract facts" |
| conflict_check | conflict | "Run conflict check against opposing party" |
| quote | (none — manual) | "Generate pricing quote" |
| engagement | (none — manual) | "Send engagement letter and collect payment" |
| drafting | drafting | "Generate draft based on matter details and Firm Memory" |
| review | review | "QA check on draft before delivery" |
| delivery | communication | "Deliver final document to client" |
| closed | (none) | null |

### 4.3 Leads Router (server/routers/leads.ts)

**Key procedures:**

```ts
leads: router({
  create: publicProcedure.input(z.object({
    firmName: z.string().min(1),
    attorneyName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    intakePath: z.enum(["quick_upload", "guided_request"]).optional(),
    referringPage: z.string().optional(),
  })).mutation(...)   // Validates email domain, saves lead immediately

  updateSession: publicProcedure.input(z.object({
    leadId: z.number(),
    sessionData: z.any(),
    lastStepCompleted: z.string(),
  })).mutation(...)   // Autosave — called on every step change

  list: protectedProcedure.query(...)
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(...)
  convertToMatter: protectedProcedure.input(z.object({ leadId: z.number() })).mutation(...)
})
```

**Email domain validation (CRITICAL):**

```ts
const BLOCKED_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com"];

function validateWorkEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !BLOCKED_DOMAINS.includes(domain);
}
```

If validation fails, return a `TRPCError` with code `BAD_REQUEST` and message: "Please use your firm's email address."

### 4.4 Conflict Check (server/routers/conflicts.ts)

The conflict check queries existing matters and firms for matching opposing party or opposing counsel names. It uses fuzzy matching (Levenshtein distance or simple `LIKE` queries) to catch near-matches.

```ts
conflicts: router({
  check: publicProcedure.input(z.object({
    opposingParty: z.string().min(1),
    opposingCounsel: z.string().optional(),
    leadId: z.number().optional(),
  })).mutation(async ({ input }) => {
    // 1. Query matters table for matching opposingParty (case-insensitive LIKE)
    // 2. Query matters table for matching opposingCounsel
    // 3. If any match found → result = "review_required"
    // 4. If no match → result = "clear"
    // 5. Insert record into conflict_checks table
    // 6. Return { result, details }
  })

  list: protectedProcedure.query(...)  // Admin view of all checks
})
```

**Important:** Never automatically reject based on conflict check. Always return either "clear" or "review_required" — never "conflict_found" from the automated check. Only a human admin can mark a true conflict.

### 4.5 Agents Router (server/routers/agents.ts)

CRUD for the Agent Registry plus task management.

```ts
agents: router({
  list: protectedProcedure.query(...)
  create: protectedProcedure.input(InsertAgentSchema).mutation(...)
  update: protectedProcedure.input(UpdateAgentSchema).mutation(...)
  
  // Task management
  listTasks: protectedProcedure.input(z.object({
    matterId: z.number().optional(),
    agentId: z.number().optional(),
    status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  })).query(...)
  
  updateTaskStatus: protectedProcedure.input(z.object({
    taskId: z.number(),
    status: z.enum(["pending", "in_progress", "completed", "failed"]),
    output: z.any().optional(),
  })).mutation(...)
})
```

### 4.6 Firm Memory (server/routers/firmMemory.ts)

Manages style profiles and sample documents per firm.

```ts
firmMemory: router({
  getProfile: protectedProcedure.input(z.object({ firmId: z.number() })).query(...)
  upsertProfile: protectedProcedure.input(UpsertProfileSchema).mutation(...)
  
  uploadSample: protectedProcedure.input(z.object({
    firmId: z.number(),
    profileId: z.number(),
    fileName: z.string(),
    fileKey: z.string(),
    fileUrl: z.string(),
    documentType: z.string().optional(),
  })).mutation(...)
  
  listSamples: protectedProcedure.input(z.object({ firmId: z.number() })).query(...)
  deleteSample: protectedProcedure.input(z.object({ id: z.number() })).mutation(...)
  
  // Analyze a sample using LLM to extract style characteristics
  analyzeSample: protectedProcedure.input(z.object({ sampleId: z.number() })).mutation(...)
})
```

**Sample analysis** uses the LLM to extract writing characteristics:

```ts
import { invokeLLM } from "../_core/llm";

async function analyzeSampleDocument(fileUrl: string, fileName: string) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a legal writing analyst. Analyze the provided document and extract the writing style characteristics."
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Analyze this legal document "${fileName}" and extract: writing tone (formal/conversational/aggressive/neutral), citation style (Bluebook/ALWD/informal), formatting preferences (heading style, paragraph structure, use of bullet points), and any distinctive argumentative patterns.` },
          { type: "file_url", file_url: { url: fileUrl, mime_type: "application/pdf" } }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "style_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            writingTone: { type: "string" },
            citationStyle: { type: "string" },
            formattingNotes: { type: "string" },
            argumentativePatterns: { type: "string" },
            vocabularyLevel: { type: "string" },
            sentenceStructure: { type: "string" },
          },
          required: ["writingTone", "citationStyle", "formattingNotes", "argumentativePatterns", "vocabularyLevel", "sentenceStructure"],
          additionalProperties: false,
        }
      }
    }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 4.7 Services & Pricing (server/routers/services.ts)

```ts
services: router({
  list: publicProcedure.query(...)   // Public — shown in intake funnel
  getById: publicProcedure.input(z.object({ id: z.number() })).query(...)
  create: protectedProcedure.input(InsertServiceSchema).mutation(...)
  update: protectedProcedure.input(UpdateServiceSchema).mutation(...)
  
  // Dynamic pricing calculator
  calculatePrice: publicProcedure.input(z.object({
    serviceId: z.number(),
    urgency: z.enum(["24h", "48h", "this_week", "flexible"]),
    hasFirmMemorySamples: z.boolean().default(false),
  })).query(async ({ input }) => {
    const service = await getServiceById(input.serviceId);
    let price = Number(service.baseFee);
    
    // Apply urgency multiplier
    switch (input.urgency) {
      case "24h": price *= Number(service.rushMultiplier24h); break;
      case "48h": price *= Number(service.rushMultiplier48h); break;
      case "this_week": price *= Number(service.rushMultiplierWeek); break;
      case "flexible": break; // no multiplier
    }
    
    // Apply sample discount
    if (input.hasFirmMemorySamples) {
      price *= (1 - Number(service.sampleDiscount));
    }
    
    return { 
      baseFee: Number(service.baseFee),
      urgencyMultiplier: getMultiplier(service, input.urgency),
      sampleDiscount: input.hasFirmMemorySamples ? Number(service.sampleDiscount) : 0,
      totalFee: Math.round(price * 100) / 100 
    };
  })
})
```

**Seed data for services table** (execute via SQL after migration):

| Name | Category | Base Fee | Standard Turnaround |
|------|----------|----------|-------------------|
| Motion to Dismiss | Motions | 350.00 | 5 business days |
| Motion for Summary Judgment | Motions | 750.00 | 7 business days |
| Opposition Brief | Motions | 500.00 | 5 business days |
| Legal Research Memo | Research | 275.00 | 3 business days |
| Appellate Brief | Appeals | 1200.00 | 14 business days |
| Discovery Responses | Discovery | 400.00 | 5 business days |
| Demand Letter | Letters | 200.00 | 2 business days |
| Settlement Agreement | Agreements | 350.00 | 3 business days |
| Immigration Petition (I-130) | Immigration | 500.00 | 5 business days |
| Immigration Petition (I-485) | Immigration | 750.00 | 7 business days |
| RFE Response | Immigration | 450.00 | 5 business days |
| Trial Brief | Trial Prep | 900.00 | 10 business days |
| Witness Outline | Trial Prep | 300.00 | 3 business days |
| Complaint Drafting | Pleadings | 400.00 | 5 business days |
| Answer Drafting | Pleadings | 350.00 | 5 business days |
| General Consultation | Consultation | 150.00 | 1 business day |
| Document Review | Review | 200.00 | 2 business days |

### 4.8 LLM-Powered Drafting (server/routers/drafting.ts)

This is the core AI capability. The drafting router invokes the LLM with Firm Memory context to produce style-matched legal documents.

```ts
drafting: router({
  generateDraft: protectedProcedure.input(z.object({
    matterId: z.number(),
    taskType: z.string(),  // e.g., "motion_to_dismiss", "research_memo"
    instructions: z.string(),
    additionalContext: z.string().optional(),
  })).mutation(async ({ input }) => {
    // 1. Load matter details
    const matter = await getMatterById(input.matterId);
    
    // 2. Load LLM config for this task type
    const config = await getLlmConfig(input.taskType);
    
    // 3. Load Firm Memory profile (if firm has one)
    const firmProfile = matter.firmId 
      ? await getFirmMemoryProfile(matter.firmId) 
      : null;
    
    // 4. Build the system prompt with Firm Memory injection
    const systemPrompt = buildDraftingPrompt(config, firmProfile, matter);
    
    // 5. Determine model based on task config
    const model = config?.preferredModel === "gpt" 
      ? "gpt-4o"  // or discover via listLLMModels()
      : "claude-sonnet-4-6";
    
    // 6. Invoke LLM
    const response = await invokeLLM({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.instructions },
      ],
      // For Claude, optionally enable thinking for complex drafts:
      ...(model.startsWith("claude") ? { thinking: { type: "enabled", budget_tokens: 4096 } } : {}),
    });
    
    // 7. Save draft as document
    // 8. Update agent task status
    // 9. Return draft content
  }),
  
  // Configure which model handles which task type
  updateConfig: protectedProcedure.input(z.object({
    taskType: z.string(),
    preferredModel: z.enum(["claude", "gpt"]),
    systemPrompt: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().optional(),
  })).mutation(...)
  
  listConfigs: protectedProcedure.query(...)
})
```

**Building the Firm Memory-aware system prompt:**

```ts
function buildDraftingPrompt(
  config: LlmTaskConfig | null,
  firmProfile: FirmMemoryProfile | null,
  matter: Matter
): string {
  let prompt = config?.systemPrompt || "You are an expert legal drafting assistant.";
  
  prompt += `\n\nMATTER CONTEXT:\n`;
  prompt += `- Type: ${matter.matterType}\n`;
  prompt += `- Jurisdiction: ${matter.jurisdiction || "Not specified"}\n`;
  prompt += `- Caption: ${matter.caption || "Not specified"}\n`;
  prompt += `- Opposing Party: ${matter.opposingParty || "Not specified"}\n`;
  
  if (firmProfile) {
    prompt += `\n\nFIRM STYLE REQUIREMENTS (MUST FOLLOW):\n`;
    prompt += `- Writing Tone: ${firmProfile.writingTone || "Professional and formal"}\n`;
    prompt += `- Citation Style: ${firmProfile.citationStyle || "Bluebook"}\n`;
    prompt += `- Caption Format: ${firmProfile.captionFormat || "Standard"}\n`;
    if (firmProfile.formattingPreferences) {
      prompt += `- Formatting: ${JSON.stringify(firmProfile.formattingPreferences)}\n`;
    }
    if (firmProfile.preferredArguments) {
      prompt += `- Preferred Argument Patterns: ${JSON.stringify(firmProfile.preferredArguments)}\n`;
    }
    if (firmProfile.additionalNotes) {
      prompt += `- Additional Style Notes: ${firmProfile.additionalNotes}\n`;
    }
    prompt += `\nYou MUST match the firm's established writing style. The output should read as if it were written by the firm's own associate attorney.`;
  }
  
  return prompt;
}
```

**Key point on model selection:** The `llm_task_configs` table stores the preferred model per task type. This is configurable from the Admin dashboard. When no config exists for a task type, default to Claude. The admin can change any task type to use GPT instead — this is the per-task-type configurability requirement.

### 4.9 Clio Integration (server/routers/clio.ts + server/clio.ts)

**Environment variables needed** (add via `webdev_request_secrets`):

| Variable | Description |
|----------|-------------|
| `CLIO_CLIENT_ID` | OAuth 2.0 Client ID from Clio Developer Portal |
| `CLIO_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `CLIO_REDIRECT_URI` | OAuth callback URL (e.g., `https://your-domain/api/clio/callback`) |
| `CLIO_WEBHOOK_SECRET` | Secret for verifying webhook signatures |

**OAuth flow:**

```ts
// server/clio.ts — Clio API client helper

const CLIO_API_BASE = "https://app.clio.com/api/v4";
const CLIO_AUTH_URL = "https://app.clio.com/oauth/authorize";
const CLIO_TOKEN_URL = "https://app.clio.com/oauth/token";

export function getClioAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CLIO_CLIENT_ID!,
    redirect_uri: process.env.CLIO_REDIRECT_URI!,
    state,
  });
  return `${CLIO_AUTH_URL}?${params}`;
}

export async function exchangeClioCode(code: string) {
  const response = await fetch(CLIO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.CLIO_CLIENT_ID!,
      client_secret: process.env.CLIO_CLIENT_SECRET!,
      redirect_uri: process.env.CLIO_REDIRECT_URI!,
    }),
  });
  return response.json(); // { access_token, refresh_token, expires_in }
}

export async function clioApiRequest(accessToken: string, endpoint: string, method = "GET", body?: any) {
  const response = await fetch(`${CLIO_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}
```

**Webhook handler** (mount in `server/_core/index.ts`):

```ts
// Mount BEFORE Vite fallthrough in server/_core/index.ts
app.post("/api/clio/webhook", express.json(), async (req, res) => {
  // 1. Verify webhook signature using CLIO_WEBHOOK_SECRET
  // 2. Parse event type and resource
  // 3. Store in clio_webhook_events table
  // 4. Process event (e.g., matter updated → sync to local matters table)
  res.status(200).json({ received: true });
});

app.get("/api/clio/callback", async (req, res) => {
  // OAuth callback — exchange code for tokens, store in clio_tokens
});
```

**Bidirectional sync procedures:**

```ts
clio: router({
  // Admin initiates OAuth
  getAuthUrl: protectedProcedure.mutation(...)
  
  // Sync operations
  syncMatters: protectedProcedure.mutation(...)      // Push/pull matters
  syncContacts: protectedProcedure.mutation(...)     // Push/pull contacts
  syncDocuments: protectedProcedure.input(z.object({
    matterId: z.number()
  })).mutation(...)                                   // Upload docs to Clio
  
  // Status
  getConnectionStatus: protectedProcedure.query(...) // Check if tokens valid
})
```

### 4.10 File Upload (server/routers/files.ts)

All file uploads go through the server to S3 via `storagePut`.

```ts
import { storagePut } from "../storage";

files: router({
  upload: protectedProcedure.input(z.object({
    matterId: z.number().optional(),
    firmId: z.number().optional(),
    fileName: z.string(),
    contentType: z.string(),
    // File bytes come via multipart form, not tRPC
  })).mutation(...)
  
  listByMatter: protectedProcedure.input(z.object({ matterId: z.number() })).query(...)
})
```

**Important:** For file uploads, create a separate Express route (not tRPC) that handles multipart form data:

```ts
// Mount in server/_core/index.ts
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.post("/api/upload", upload.single("file"), async (req, res) => {
  // 1. Authenticate user from session cookie
  // 2. Get file buffer from req.file
  // 3. Generate unique key: `${context}/${nanoid()}-${originalName}`
  // 4. Call storagePut(key, buffer, contentType)
  // 5. Return { key, url, fileName }
});
```

### 4.11 Abandoned Session Follow-up (Heartbeat Cron)

Use the Heartbeat scheduling system to send follow-up emails for abandoned intake sessions. This requires a project-level cron (not end-user-driven).

**Handler** (`server/handlers/abandonedSessions.ts`):

```ts
import { sdk } from "../_core/sdk";

export async function abandonedSessionHandler(req, res) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });
    
    // 1. Query leads where status = "in_progress" 
    //    AND updatedAt < NOW() - 1 hour
    //    AND followUpSent = false
    // 2. For each abandoned lead, send follow-up email via notification API
    // 3. Mark followUpSent = true
    
    res.json({ ok: true, processed: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

**Mount in `server/_core/index.ts`:**

```ts
app.post("/api/scheduled/abandoned-sessions", abandonedSessionHandler);
```

**Create the cron after deployment** via CLI:

```bash
manus-heartbeat create \
  --name abandoned-session-followup \
  --cron "0 0 * * * *" \
  --path /api/scheduled/abandoned-sessions \
  --description "Hourly check for abandoned intake sessions"
```

---

## 5. Frontend Implementation

### 5.1 Design System

**Theme:** Professional, clean, enterprise-grade — similar to Clio, Legora, or E-immigration platforms. Light theme default with a dark sidebar for the admin dashboard.

**Colors (OKLCH for Tailwind 4):**

```css
/* client/src/index.css — @theme block */
@theme inline {
  --color-primary: oklch(0.45 0.15 250);      /* Deep professional blue */
  --color-primary-foreground: oklch(0.98 0 0); /* White */
  --color-secondary: oklch(0.55 0.05 250);     /* Muted blue-gray */
  --color-accent: oklch(0.60 0.12 160);        /* Teal accent */
  --color-destructive: oklch(0.55 0.2 25);     /* Red for errors */
  --color-muted: oklch(0.95 0.01 250);         /* Light gray backgrounds */
  --color-border: oklch(0.88 0.01 250);        /* Subtle borders */
}
```

**Font:** Inter (already available via Google Fonts CDN). Add to `client/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### 5.2 Route Structure

```tsx
// client/src/App.tsx
<Switch>
  {/* Public routes */}
  <Route path="/associate" component={AssociateLanding} />
  <Route path="/associate/intake" component={IntakeFunnel} />
  <Route path="/associate/intake/quick" component={QuickUpload} />
  <Route path="/associate/intake/guided" component={GuidedRequest} />
  
  {/* Admin routes (protected) */}
  <Route path="/admin" component={AdminDashboard} />
  <Route path="/admin/matters" component={MatterPipeline} />
  <Route path="/admin/matters/:id" component={MatterDetail} />
  <Route path="/admin/leads" component={LeadManagement} />
  <Route path="/admin/agents" component={AgentRegistry} />
  <Route path="/admin/firm-memory" component={FirmMemoryManagement} />
  <Route path="/admin/services" component={ServiceManagement} />
  <Route path="/admin/drafting" component={DraftingConfig} />
  <Route path="/admin/clio" component={ClioIntegration} />
  
  {/* Auth */}
  <Route path="/" component={Home} />  {/* Redirects to /associate or /admin */}
  <Route component={NotFound} />
</Switch>
```

### 5.3 /associate Landing Page

This page is **completely standalone** — no links to any consumer-facing site. It must sell the service to managing partners of law firms.

**Page sections (top to bottom):**

1. **Hero** — "An Associate Attorney. Without Hiring One." + subheadline + two CTAs (Quick Upload / Guided Request)
2. **Credibility** — "Meet Your Associate" with bio of La'Dajia Ferguson, Esq.
3. **How It Works** — 4-step visual process (Submit → Conflict Check → Draft → Deliver)
4. **Services** — Grid of service categories with starting prices
5. **Firm Memory** — Explanation of style-matching capability
6. **Who We Serve** — Target client types (solo, small lit, immigration, PI, etc.)
7. **FAQ** — Expanded accordion (10+ questions)
8. **CTA** — Final call to action

### 5.4 Intake Funnel

The intake funnel is a multi-step form with two paths. Use a stepper/wizard UI pattern.

**Path selection component** (`client/src/pages/intake/PathSelector.tsx`):

Two large cards side by side:
- **Quick Upload** — icon, 3-line description, "Get Started" button → navigates to `/associate/intake/quick`
- **Guided Request** — icon, 3-line description, "Walk Me Through It" button → navigates to `/associate/intake/guided`

**Quick Upload flow** (3 steps):

| Step | Fields | Behavior |
|------|--------|----------|
| 1. Firm Info | Firm Name*, Attorney Name*, Work Email*, Phone | Validate email domain. Save lead on "Continue". |
| 2. Upload & Deadline | File dropzone (multi-file), Deadline picker, Notes textarea | Autosave on change. |
| 3. Confirm | Summary of submission | Submit button. Show confirmation. |

**Guided Request flow** (7 steps):

| Step | Fields | Behavior |
|------|--------|----------|
| 1. Firm Info | Same as Quick Upload Step 1 | Save lead on "Continue". |
| 2. Practice & Engagement | Practice area, Firm size, Previous engagement, Referral, Urgency (4 tiers), Engagement type, Outsourcing volume, Firm Memory opt-in | Autosave. |
| 3. Conflict Check | Opposing Party*, Opposing Counsel | Real-time check. Show result before proceeding. |
| 4. Service & Pricing | Service selector, Dynamic price calculator showing base + urgency + discount | Read-only price display. |
| 5. Matter Details | Jurisdiction, Deadline, Page estimate, Complexity, Caption, Description | Autosave. |
| 6. Document Upload | File dropzone + optional Firm Memory sample upload | Autosave. |
| 7. Review & Pay | Full summary + Accept + Stripe payment | Stripe Checkout or Elements. |

**Autosave implementation:** On every step change or field blur, call `trpc.leads.updateSession.mutate()` with the current form state serialized as `sessionData`. Use `debounce` (300ms) to avoid excessive calls.

### 5.5 Admin Dashboard

Use the pre-built `DashboardLayout` component with sidebar navigation.

**Sidebar navigation items:**

| Label | Icon | Route |
|-------|------|-------|
| Pipeline | Kanban | /admin/matters |
| Leads | Users | /admin/leads |
| Agents | Bot | /admin/agents |
| Firm Memory | Brain | /admin/firm-memory |
| Services | DollarSign | /admin/services |
| Drafting | FileText | /admin/drafting |
| Clio | Link | /admin/clio |
| Settings | Settings | /admin/settings |

**Matter Pipeline view** — A Kanban board with 8 columns (one per stage). Each card shows: matter title, firm name, urgency badge, deadline, assigned agent. Drag-and-drop to transition stages (with validation).

**Lead Management** — Table with columns: Firm, Attorney, Email, Path, Status, Last Step, Created. Actions: Convert to Matter, Send Follow-up, Archive.

**Firm Memory Management** — List of firms with Firm Memory enabled. Click into a firm to see/edit their style profile and manage uploaded samples. "Analyze" button triggers LLM analysis of samples.

**Drafting Config** — Table of task types with their assigned model (Claude/GPT), temperature, and system prompt. Editable inline or via modal.

---

## 6. Stripe Integration

Use `webdev_add_feature("stripe")` to scaffold the Stripe integration. Then wire it into the intake funnel's final step.

**Payment flow:**

1. User completes intake and sees final price.
2. User clicks "Accept & Pay."
3. Frontend calls `trpc.payments.createCheckoutSession.mutate({ matterId, amount })`.
4. Backend creates a Stripe Checkout Session with the matter's `totalFee`.
5. Frontend redirects to Stripe Checkout.
6. On success, Stripe webhook fires → backend updates `matters.paymentStatus = "paid"` and `matters.stripePaymentId`.
7. Matter transitions from `engagement` to `drafting` stage automatically.

---

## 7. What You (the Managing Partner) Need to Provide

Before Cursor can fully implement this, the following inputs are required:

| Item | When Needed | Why |
|------|-------------|-----|
| Clio API credentials (Client ID + Secret) | Before Clio integration | OAuth flow requires registered app |
| Stripe API keys (Publishable + Secret) | Before payment integration | Payment processing |
| Domain/URL for production | Before Clio webhook + Stripe webhook setup | Callback URLs must be absolute |
| Service pricing confirmation | Before seeding services table | Verify the fee schedule |
| Firm Memory sample documents | After Firm Memory is built | To test style analysis |
| Bar number | Before any live matter acceptance | Required for conflict check and engagement |

---

## 8. What Each Agent Needs from You and When

| Agent | What It Needs | When | Your Action |
|-------|--------------|------|-------------|
| **Intake Agent** | Intake form submissions | Automatic (triggered by form submit) | None — fully automated |
| **Conflict Agent** | Opposing party/counsel names | During intake (Step 3 of Guided path) | None — user provides data |
| **Research Agent** | Matter details + legal questions | After matter enters "drafting" stage | Provide specific research instructions via admin |
| **Drafting Agent** | Matter details + Firm Memory profile + instructions | After matter enters "drafting" stage | Provide drafting instructions; ensure Firm Memory is populated |
| **Review Agent** | Completed draft | After drafting completes | Review the QA report and approve/reject |
| **Communication Agent** | Client email + status update | On stage transitions | None — automated notifications |
| **Calendar Agent** | Deadlines from matters | Continuous | Set accurate deadlines during intake |
| **Discovery Agent** | Discovery requests + matter docs | When assigned discovery tasks | Upload relevant documents |

---

## 9. Resolving the Claude/GPT Drafting Quality Issue

The current issue where drafting "doesn't seem to be drafting as though it is Claude Cowork" is caused by one or more of these problems:

**Problem 1: Wrong model being invoked.** The `llm_task_configs` table allows per-task-type model selection. Verify that drafting tasks are configured to use `claude-sonnet-4-6` (not a weaker model). Use `listLLMModels()` to discover exact available model IDs.

**Problem 2: Missing Firm Memory context.** Without style context in the system prompt, the LLM produces generic legal writing. The `buildDraftingPrompt` function (Section 4.8) injects Firm Memory data into every drafting call. Upload samples and run analysis to populate the profile.

**Problem 3: Insufficient system prompt.** The default system prompt is too generic. Each task type should have a detailed, role-specific system prompt stored in `llm_task_configs.systemPrompt`. Example for motion drafting:

> You are an experienced litigation associate attorney drafting a motion for a law firm client. You write with precision, cite relevant case law with proper Bluebook formatting, and structure arguments persuasively. Your writing is concise but thorough — every sentence advances the argument. You follow the firm's established style exactly as specified in the FIRM STYLE REQUIREMENTS section.

**Problem 4: No thinking/reasoning enabled.** For complex legal drafting, enable Claude's extended thinking:

```ts
await invokeLLM({
  model: "claude-sonnet-4-6",
  messages: [...],
  thinking: { type: "enabled", budget_tokens: 4096 },
});
```

This gives Claude internal reasoning space before producing the final output, resulting in more coherent and well-structured legal writing.

---

## 10. File Structure Summary

```
rmv_legal_os/
├── client/
│   ├── index.html                    ← Add Inter font
│   └── src/
│       ├── index.css                 ← Design tokens
│       ├── App.tsx                   ← All routes
│       ├── pages/
│       │   ├── Home.tsx              ← Redirect logic
│       │   ├── Associate.tsx         ← /associate landing
│       │   ├── intake/
│       │   │   ├── PathSelector.tsx  ← Quick vs Guided choice
│       │   │   ├── QuickUpload.tsx   ← 3-step quick path
│       │   │   └── GuidedRequest.tsx ← 7-step guided path
│       │   └── admin/
│       │       ├── Dashboard.tsx     ← Overview
│       │       ├── MatterPipeline.tsx← Kanban board
│       │       ├── MatterDetail.tsx  ← Single matter view
│       │       ├── LeadManagement.tsx
│       │       ├── AgentRegistry.tsx
│       │       ├── FirmMemory.tsx
│       │       ├── ServiceManagement.tsx
│       │       ├── DraftingConfig.tsx
│       │       └── ClioIntegration.tsx
│       └── components/
│           ├── intake/               ← Shared intake components
│           └── admin/                ← Shared admin components
├── server/
│   ├── routers.ts                    ← Main router composition
│   ├── routers/
│   │   ├── auth.ts
│   │   ├── matters.ts
│   │   ├── leads.ts
│   │   ├── conflicts.ts
│   │   ├── agents.ts
│   │   ├── firmMemory.ts
│   │   ├── services.ts
│   │   ├── drafting.ts
│   │   ├── clio.ts
│   │   └── files.ts
│   ├── clio.ts                       ← Clio API client helper
│   ├── handlers/
│   │   └── abandonedSessions.ts      ← Cron handler
│   ├── db.ts                         ← Query helpers
│   └── storage.ts                    ← S3 helpers (pre-built)
├── drizzle/
│   ├── schema.ts                     ← 14 tables (DONE)
│   └── 0001_colossal_ghost_rider.sql ← Migration (DONE)
└── shared/
    └── types.ts                      ← Shared type definitions
```

---

## 11. Testing Strategy

Write Vitest tests for critical backend logic:

| Test File | What to Test |
|-----------|-------------|
| `server/matters.test.ts` | Stage transitions (valid + invalid), matter creation |
| `server/leads.test.ts` | Email domain validation, lead creation, autosave |
| `server/conflicts.test.ts` | Conflict matching logic |
| `server/pricing.test.ts` | Price calculation with all urgency tiers + discount |
| `server/drafting.test.ts` | Prompt building with/without Firm Memory |

---

## 12. Deployment Notes

The project deploys on Manus Autoscale (serverless). Key constraints:

- No persistent in-process state (use database for everything).
- No `setInterval` or `node-cron` — use Heartbeat for scheduled work.
- Cold starts possible — keep initialization lightweight.
- 180-second request timeout — LLM calls should complete within this.
- File uploads go to S3 via `storagePut`, not local filesystem.

After building, save a checkpoint and click Publish in the Manus UI.
