import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import { db, chatMessagesTable, type ChatMessageRow } from "@workspace/db";
import { asc, desc, gt } from "drizzle-orm";

const router: IRouter = Router();

// ── Constants ──────────────────────────────────────────────────────────────
const COOKIE_NAME = "chat_sid";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year
const NAME_MIN = 2;
const NAME_MAX = 20;
const CONTENT_MAX = 500;
const RATE_LIMIT_MS = 1500;        // min ms between posts per session
const IP_RATE_LIMIT_MS = 800;      // tighter per-IP floor (resists sid rotation)
const IP_MAX_PER_MINUTE = 30;      // hard cap per IP per rolling minute
const MAX_INITIAL = 200;
const RATE_MAP_CAP = 10_000;        // bound memory; evict oldest when exceeded
const RATE_TTL_MS = 5 * 60_000;     // entries unused for 5min are stale

// Two limiters: per-session (legitimate users) + per-IP (defends against
// sid-rotation bypass). Both are best-effort in-memory; if we ever scale
// horizontally these need to move to Redis.
const lastPostBySession = new Map<string, number>();
const lastPostByIp = new Map<string, number>();
const ipMinuteWindow = new Map<string, number[]>(); // ip → recent post timestamps

function evictStale(map: Map<string, unknown>): void {
  if (map.size <= RATE_MAP_CAP) return;
  // JS Map preserves insertion order; drop the oldest 25% to amortize cost.
  const toDrop = Math.floor(map.size / 4);
  let i = 0;
  for (const k of map.keys()) {
    if (i++ >= toDrop) break;
    map.delete(k);
  }
}

// Periodic cleanup of stale entries (in addition to size-cap eviction).
setInterval(() => {
  const cutoff = Date.now() - RATE_TTL_MS;
  for (const [k, v] of lastPostBySession) if (v < cutoff) lastPostBySession.delete(k);
  for (const [k, v] of lastPostByIp) if (v < cutoff) lastPostByIp.delete(k);
  for (const [k, arr] of ipMinuteWindow) {
    const fresh = arr.filter((t) => t > Date.now() - 60_000);
    if (fresh.length === 0) ipMinuteWindow.delete(k);
    else ipMinuteWindow.set(k, fresh);
  }
}, 60_000).unref?.();

function clientIp(req: Request): string {
  // Express's req.ip already honors trust proxy if configured. Fall back to
  // socket address. Truncate IPv6 to /64 so we don't keyspace-explode.
  const raw = (req.ip || req.socket.remoteAddress || "unknown").toString();
  if (raw.includes(":")) return raw.split(":").slice(0, 4).join(":");
  return raw;
}

// CSRF defense: only accept POSTs whose Origin header matches a known host.
// SameSite=lax already prevents most cross-site form-POST attacks, but adding
// an explicit Origin allowlist makes us belt-and-suspenders safe.
function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin || typeof origin !== "string") {
    // No Origin header: same-origin GETs send none, but browsers send Origin
    // for all cross-site POSTs. Missing Origin on a POST from a real browser
    // means same-origin/native — accept.
    return true;
  }
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const reqHost = (req.headers.host ?? "").toString();
  if (host === reqHost) return true;
  // Replit publishes the served domain(s) in REPLIT_DOMAINS (comma separated).
  const allowed = (process.env["REPLIT_DOMAINS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.includes(host)) return true;
  // Local dev escape hatch.
  if (host === "localhost" || host.startsWith("localhost:") || host.startsWith("127.0.0.1")) return true;
  return false;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getOrSetSessionId(req: Request, res: Response): string {
  const existing = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME];
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const sid = randomBytes(16).toString("hex");
  res.cookie(COOKIE_NAME, sid, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
  });
  return sid;
}

function sanitizeName(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const cleaned = s.trim().replace(/\s+/g, " ");
  if (cleaned.length < NAME_MIN || cleaned.length > NAME_MAX) return null;
  // Letters (any script), numbers, space, underscore, hyphen, period.
  if (!/^[\p{L}\p{N}_\-. ]+$/u.test(cleaned)) return null;
  return cleaned;
}

function sanitizeContent(s: unknown): string | null {
  if (typeof s !== "string") return null;
  // Collapse runs of whitespace but keep single newlines collapsed too — chat
  // is single-line per message in this UI.
  const cleaned = s.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0 || cleaned.length > CONTENT_MAX) return null;
  return cleaned;
}

function rowToWire(r: ChatMessageRow, mySid: string) {
  return {
    id: r.id,
    name: r.displayName,
    content: r.content,
    createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date()).toISOString(),
    isMine: r.sessionId === mySid,
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────
// GET /api/chat/identity — read or mint our session cookie.
router.get("/chat/identity", (req, res) => {
  const sid = getOrSetSessionId(req, res);
  res.json({ sessionId: sid });
});

// GET /api/chat/messages?after=<id>&limit=<n>
//   No `after` → return the last `limit` messages, ascending by id.
//   With `after` → return messages with id > after, ascending (poll mode).
router.get("/chat/messages", async (req, res) => {
  try {
    const sid = getOrSetSessionId(req, res);
    const limit = Math.min(MAX_INITIAL, Math.max(1, Number(req.query["limit"] ?? 100)));
    const after = Number(req.query["after"] ?? 0);

    let rows: ChatMessageRow[];
    if (Number.isFinite(after) && after > 0) {
      rows = await db
        .select()
        .from(chatMessagesTable)
        .where(gt(chatMessagesTable.id, after))
        .orderBy(asc(chatMessagesTable.id))
        .limit(limit);
    } else {
      const recent = await db
        .select()
        .from(chatMessagesTable)
        .orderBy(desc(chatMessagesTable.id))
        .limit(limit);
      rows = recent.reverse();
    }

    res.json({ messages: rows.map((r) => rowToWire(r, sid)) });
  } catch (err) {
    req.log.warn({ err: String(err) }, "chat messages fetch failed");
    res.status(500).json({ error: "fetch_failed" });
  }
});

// POST /api/chat/messages { name, content }
router.post("/chat/messages", async (req, res) => {
  try {
    if (!isOriginAllowed(req)) {
      res.status(403).json({ error: "forbidden_origin" });
      return;
    }

    const sid = getOrSetSessionId(req, res);
    const name = sanitizeName(req.body?.name);
    const content = sanitizeContent(req.body?.content);
    if (!name) {
      res.status(400).json({
        error: "invalid_name",
        message: `Name must be ${NAME_MIN}-${NAME_MAX} chars (letters, numbers, _-.)`,
      });
      return;
    }
    if (!content) {
      res.status(400).json({
        error: "invalid_content",
        message: `Message must be 1-${CONTENT_MAX} chars`,
      });
      return;
    }

    const ip = clientIp(req);
    const now = Date.now();

    // Per-session floor.
    const lastSession = lastPostBySession.get(sid) ?? 0;
    if (now - lastSession < RATE_LIMIT_MS) {
      res.status(429).json({ error: "rate_limited", message: "Slow down — wait a moment." });
      return;
    }
    // Per-IP floor — defends against sid rotation.
    const lastIp = lastPostByIp.get(ip) ?? 0;
    if (now - lastIp < IP_RATE_LIMIT_MS) {
      res.status(429).json({ error: "rate_limited", message: "Slow down — wait a moment." });
      return;
    }
    // Per-IP rolling-minute cap.
    const recent = (ipMinuteWindow.get(ip) ?? []).filter((t) => t > now - 60_000);
    if (recent.length >= IP_MAX_PER_MINUTE) {
      res.status(429).json({ error: "rate_limited", message: "Too many messages this minute." });
      return;
    }
    recent.push(now);
    ipMinuteWindow.set(ip, recent);
    lastPostBySession.set(sid, now);
    lastPostByIp.set(ip, now);
    evictStale(lastPostBySession);
    evictStale(lastPostByIp);
    evictStale(ipMinuteWindow);

    const [inserted] = await db
      .insert(chatMessagesTable)
      .values({ sessionId: sid, displayName: name, content })
      .returning();

    if (!inserted) {
      res.status(500).json({ error: "insert_failed" });
      return;
    }

    res.json({ message: rowToWire(inserted, sid) });
  } catch (err) {
    req.log.warn({ err: String(err) }, "chat post failed");
    res.status(500).json({ error: "post_failed" });
  }
});

export default router;
