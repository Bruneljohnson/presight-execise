import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const people = sqliteTable("people", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  avatar: text("avatar").notNull(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  age: integer("age").notNull(),
  nationality: text("nationality").notNull(),
  hobbies: text("hobbies").notNull().default("[]"), // JSON array
});

export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
