import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

// The Lounge — a single global chat room. Each row is one posted message.
// `sessionId` is an opaque random ID stored in an httpOnly cookie so we can
// attribute messages and rate-limit per poster without requiring user auth.
// `displayName` is frozen at post time, so renaming yourself later doesn't
// rewrite history.
export const chatMessagesTable = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    displayName: text("display_name").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    byCreatedAt: index("chat_messages_created_idx").on(t.createdAt),
  }),
);

export type ChatMessageRow = typeof chatMessagesTable.$inferSelect;
export type InsertChatMessage = typeof chatMessagesTable.$inferInsert;
