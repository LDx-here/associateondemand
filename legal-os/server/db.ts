import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

let pool: mysql.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is required. Start MySQL via docker-compose or set TiDB URL.");
    }
    pool = mysql.createPool(url);
  }
  return pool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema, mode: "default" });
  }
  return db;
}

export { schema };
