import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

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

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  state: varchar("state", { length: 50 }).notNull(),
  practiceArea: mysqlEnum("practiceArea", ["Property Damage", "Personal Injury", "Immigration", "Not sure yet"]).default("Not sure yet").notNull(),
  inquiryType: mysqlEnum("inquiryType", ["general", "understand", "strategy", "representation"]).default("general").notNull(),
  description: text("description").notNull(),
  newsletterOptIn: boolean("newsletterOptIn").default(false).notNull(),
  status: mysqlEnum("status", ["New", "Contacted", "Strategy Call Booked", "Active Client", "Closed"]).default("New").notNull(),
  source: varchar("source", { length: 50 }).default("website").notNull(),
  airtableRecordId: varchar("airtableRecordId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
