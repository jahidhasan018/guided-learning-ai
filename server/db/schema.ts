import { pgTable, serial, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null for social login
  name: text("name").notNull(),
  role: text("role").default("user").notNull(), // 'user', 'superadmin'
  provider: text("provider").default("local"), // 'local', 'google', 'github', etc.
  preferences: jsonb("preferences"), // stores theme, provider, api keys
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // using timestamp strings from current logic or uuid
  userId: serial("user_id").references(() => users.id).notNull(),
  topic: text("topic").notNull(),
  level: text("level").notNull(),
  mode: text("mode").notNull(),
  language: text("language").notNull(),
  roadmapItems: jsonb("roadmap_items"), // storing as jsonb for simplicity as it's ordered and nested
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(), // 'model' | 'user'
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
