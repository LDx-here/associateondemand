import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// FIRMS - Client law firms using RMV:AS
// ============================================================
export const firms = mysqlTable("firms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  practiceArea: varchar("practiceArea", { length: 100 }),
  firmSize: varchar("firmSize", { length: 50 }),
  referralSource: varchar("referralSource", { length: 100 }),
  engagementType: varchar("engagementType", { length: 100 }),
  outsourcingVolume: varchar("outsourcingVolume", { length: 50 }),
  firmMemoryEnabled: boolean("firmMemoryEnabled").default(false),
  clioClientId: varchar("clioClientId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Firm = typeof firms.$inferSelect;
export type InsertFirm = typeof firms.$inferInsert;

// ============================================================
// LEADS - Captured from intake funnel
// ============================================================
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  firmName: varchar("firmName", { length: 255 }).notNull(),
  attorneyName: varchar("attorneyName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  intakePath: mysqlEnum("intakePath", ["quick_upload", "guided_request"]),
  status: mysqlEnum("status", ["new", "in_progress", "abandoned", "converted"]).default("new").notNull(),
  lastStepCompleted: varchar("lastStepCompleted", { length: 100 }),
  referringPage: varchar("referringPage", { length: 500 }),
  sessionData: json("sessionData"),
  followUpSent: boolean("followUpSent").default(false),
  convertedToMatterId: int("convertedToMatterId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ============================================================
// MATTERS - Central Matter Engine
// ============================================================
export const matters = mysqlTable("matters", {
  id: int("id").autoincrement().primaryKey(),
  firmId: int("firmId"),
  leadId: int("leadId"),
  title: varchar("title", { length: 500 }).notNull(),
  matterType: mysqlEnum("matterType", ["employment", "pi", "immigration"]).notNull(),
  stage: mysqlEnum("stage", [
    "intake",
    "conflict_check",
    "quote",
    "engagement",
    "drafting",
    "review",
    "delivery",
    "closed"
  ]).default("intake").notNull(),
  status: varchar("status", { length: 100 }).default("pending").notNull(),
  nextAction: varchar("nextAction", { length: 500 }),
  assignedAgentId: int("assignedAgentId"),
  deadline: timestamp("deadline"),
  urgency: mysqlEnum("urgency", ["24h", "48h", "this_week", "flexible"]).default("flexible").notNull(),
  jurisdiction: varchar("jurisdiction", { length: 200 }),
  opposingParty: varchar("opposingParty", { length: 500 }),
  opposingCounsel: varchar("opposingCounsel", { length: 500 }),
  caption: varchar("caption", { length: 500 }),
  description: text("description"),
  serviceType: varchar("serviceType", { length: 200 }),
  complexity: mysqlEnum("complexity", ["low", "medium", "high"]).default("medium"),
  estimatedPages: int("estimatedPages"),
  totalFee: decimal("totalFee", { precision: 10, scale: 2 }),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded"]).default("pending"),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  clioMatterId: varchar("clioMatterId", { length: 100 }),
  conflictStatus: mysqlEnum("conflictStatus", ["clear", "review_required", "conflict_found", "pending"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export type Matter = typeof matters.$inferSelect;
export type InsertMatter = typeof matters.$inferInsert;

// ============================================================
// AGENTS - Agent Registry
// ============================================================
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", [
    "intake",
    "conflict",
    "research",
    "drafting",
    "discovery",
    "calendar",
    "communication",
    "review"
  ]).notNull(),
  description: text("description"),
  llmModel: mysqlEnum("llmModel", ["claude", "gpt"]).default("claude"),
  isActive: boolean("isActive").default(true),
  config: json("config"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ============================================================
// AGENT TASKS - Tasks assigned to agents by the Matter Engine
// ============================================================
export const agentTasks = mysqlTable("agent_tasks", {
  id: int("id").autoincrement().primaryKey(),
  matterId: int("matterId").notNull(),
  agentId: int("agentId").notNull(),
  taskType: varchar("taskType", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).default("pending").notNull(),
  input: json("input"),
  output: json("output"),
  llmModel: mysqlEnum("llmModel", ["claude", "gpt"]),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = typeof agentTasks.$inferInsert;

// ============================================================
// FIRM MEMORY - Style profiles and samples
// ============================================================
export const firmMemoryProfiles = mysqlTable("firm_memory_profiles", {
  id: int("id").autoincrement().primaryKey(),
  firmId: int("firmId").notNull(),
  writingTone: varchar("writingTone", { length: 100 }),
  citationStyle: varchar("citationStyle", { length: 100 }),
  formattingPreferences: json("formattingPreferences"),
  captionFormat: text("captionFormat"),
  preferredArguments: json("preferredArguments"),
  additionalNotes: text("additionalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FirmMemoryProfile = typeof firmMemoryProfiles.$inferSelect;
export type InsertFirmMemoryProfile = typeof firmMemoryProfiles.$inferInsert;

export const firmMemorySamples = mysqlTable("firm_memory_samples", {
  id: int("id").autoincrement().primaryKey(),
  firmId: int("firmId").notNull(),
  profileId: int("profileId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  documentType: varchar("documentType", { length: 100 }),
  analysisResult: json("analysisResult"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FirmMemorySample = typeof firmMemorySamples.$inferSelect;
export type InsertFirmMemorySample = typeof firmMemorySamples.$inferInsert;

// ============================================================
// DOCUMENTS - Matter documents
// ============================================================
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  matterId: int("matterId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  documentType: varchar("documentType", { length: 100 }),
  version: int("version").default(1).notNull(),
  uploadedBy: varchar("uploadedBy", { length: 100 }),
  clioDocumentId: varchar("clioDocumentId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ============================================================
// CONFLICT CHECKS
// ============================================================
export const conflictChecks = mysqlTable("conflict_checks", {
  id: int("id").autoincrement().primaryKey(),
  matterId: int("matterId"),
  leadId: int("leadId"),
  opposingParty: varchar("opposingParty", { length: 500 }).notNull(),
  opposingCounsel: varchar("opposingCounsel", { length: 500 }),
  result: mysqlEnum("result", ["clear", "review_required", "conflict_found"]).notNull(),
  details: text("details"),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
});

export type ConflictCheck = typeof conflictChecks.$inferSelect;
export type InsertConflictCheck = typeof conflictChecks.$inferInsert;

// ============================================================
// SERVICES & PRICING
// ============================================================
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }),
  baseFee: decimal("baseFee", { precision: 10, scale: 2 }).notNull(),
  rushMultiplier24h: decimal("rushMultiplier24h", { precision: 4, scale: 2 }).default("2.00"),
  rushMultiplier48h: decimal("rushMultiplier48h", { precision: 4, scale: 2 }).default("1.50"),
  rushMultiplierWeek: decimal("rushMultiplierWeek", { precision: 4, scale: 2 }).default("1.25"),
  sampleDiscount: decimal("sampleDiscount", { precision: 4, scale: 2 }).default("0.10"),
  standardTurnaround: varchar("standardTurnaround", { length: 100 }),
  deliverables: text("deliverables"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// ============================================================
// CLIO INTEGRATION
// ============================================================
export const clioTokens = mysqlTable("clio_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  scope: text("scope"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClioToken = typeof clioTokens.$inferSelect;
export type InsertClioToken = typeof clioTokens.$inferInsert;

export const clioWebhookEvents = mysqlTable("clio_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  resourceType: varchar("resourceType", { length: 100 }).notNull(),
  resourceId: varchar("resourceId", { length: 100 }).notNull(),
  payload: json("payload"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClioWebhookEvent = typeof clioWebhookEvents.$inferSelect;
export type InsertClioWebhookEvent = typeof clioWebhookEvents.$inferInsert;

// ============================================================
// LLM TASK CONFIGURATION
// ============================================================
export const llmTaskConfigs = mysqlTable("llm_task_configs", {
  id: int("id").autoincrement().primaryKey(),
  taskType: varchar("taskType", { length: 100 }).notNull().unique(),
  preferredModel: mysqlEnum("preferredModel", ["claude", "gpt"]).default("claude").notNull(),
  systemPrompt: text("systemPrompt"),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.70"),
  maxTokens: int("maxTokens").default(4096),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LlmTaskConfig = typeof llmTaskConfigs.$inferSelect;
export type InsertLlmTaskConfig = typeof llmTaskConfigs.$inferInsert;
