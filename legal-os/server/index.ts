import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { nanoid } from "nanoid";
import { appRouter } from "./routers.js";
import { createContext } from "./_core/trpc.js";
import { storagePut } from "./storage.js";
import { abandonedSessionHandler } from "./handlers/abandonedSessions.js";
import { handleClioOAuthCallback, handleClioWebhook } from "./routers/clio.js";
import { handleStripeWebhook } from "./routers/payments.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// Stripe webhook needs raw body
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const result = await handleStripeWebhook(req.body as Buffer, req.headers["stripe-signature"] as string);
  res.status(result.status).json(result.body);
});

app.use(express.json());

app.post("/api/clio/webhook", async (req, res) => {
  const result = await handleClioWebhook(req.body, req.headers["x-clio-signature"] as string);
  res.status(result.status).json(result.body);
});

app.get("/api/clio/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Missing code");
  const result = await handleClioOAuthCallback(code, 0);
  if ("error" in result) return res.status(503).send(result.error);
  res.redirect("/admin/clio?connected=1");
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  const apiKey = req.headers["x-admin-key"] ?? req.cookies?.legal_os_session;
  if (apiKey !== process.env.ADMIN_API_KEY && req.cookies?.legal_os_session !== "admin") {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      // Allow public intake uploads with lead context
      if (!req.body?.leadId && !req.query.public) {
        return res.status(401).json({ error: "Authentication required for admin uploads." });
      }
    }
  }

  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const context = (req.body?.context as string) ?? "uploads";
  const key = `${context}/${nanoid()}-${req.file.originalname}`;
  const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);

  res.json({ key, url, fileName: req.file.originalname });
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.post("/api/scheduled/abandoned-sessions", abandonedSessionHandler);

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "rmv-legal-os" });
});

// Serve Vite build in production
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "../dist/client");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`RMV Legal OS API listening on http://localhost:${PORT}`);
});

export { app };
