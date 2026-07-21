import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const SERVICES = [
  ["Motion to Dismiss", "Motions", 350.0, "5 business days"],
  ["Motion for Summary Judgment", "Motions", 750.0, "7 business days"],
  ["Opposition Brief", "Motions", 500.0, "5 business days"],
  ["Legal Research Memo", "Research", 275.0, "3 business days"],
  ["Appellate Brief", "Appeals", 1200.0, "14 business days"],
  ["Discovery Responses", "Discovery", 400.0, "5 business days"],
  ["Demand Letter", "Letters", 200.0, "2 business days"],
  ["Settlement Agreement", "Agreements", 350.0, "3 business days"],
  ["Immigration Petition (I-130)", "Immigration", 500.0, "5 business days"],
  ["Immigration Petition (I-485)", "Immigration", 750.0, "7 business days"],
  ["RFE Response", "Immigration", 450.0, "5 business days"],
  ["Trial Brief", "Trial Prep", 900.0, "10 business days"],
  ["Witness Outline", "Trial Prep", 300.0, "3 business days"],
  ["Complaint Drafting", "Pleadings", 400.0, "5 business days"],
  ["Answer Drafting", "Pleadings", 350.0, "5 business days"],
  ["General Consultation", "Consultation", 150.0, "1 business day"],
  ["Document Review", "Review", 200.0, "2 business days"],
];

const AGENTS = [
  ["Intake Agent", "intake", "Processes intake submissions"],
  ["Conflict Agent", "conflict", "Runs conflict checks"],
  ["Research Agent", "research", "Legal research memos"],
  ["Drafting Agent", "drafting", "Generates legal drafts"],
  ["Discovery Agent", "discovery", "Discovery responses"],
  ["Calendar Agent", "calendar", "Deadline tracking"],
  ["Communication Agent", "communication", "Client delivery"],
  ["Review Agent", "review", "QA before delivery"],
];

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const pool = mysql.createPool(url);
  const db = drizzle(pool, { schema, mode: "default" });

  const existing = await db.select().from(schema.services).limit(1);
  if (existing.length === 0) {
    for (const [name, category, baseFee, turnaround] of SERVICES) {
      await db.insert(schema.services).values({
        name,
        category,
        baseFee: baseFee.toFixed(2),
        standardTurnaround: turnaround,
      });
    }
    console.log(`Seeded ${SERVICES.length} services`);
  } else {
    console.log("Services already seeded");
  }

  const existingAgents = await db.select().from(schema.agents).limit(1);
  if (existingAgents.length === 0) {
    for (const [name, type, description] of AGENTS) {
      await db.insert(schema.agents).values({
        name,
        type: type as typeof schema.agents.type.enumValues[number],
        description,
      });
    }
    console.log(`Seeded ${AGENTS.length} agents`);
  } else {
    console.log("Agents already seeded");
  }

  await pool.end();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
