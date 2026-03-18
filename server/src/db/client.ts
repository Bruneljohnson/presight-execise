import Database from "better-sqlite3";
import { faker } from "@faker-js/faker";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(__dirname, "../../data/presight.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("cache_size = -16000"); // 16 MB page cache to match mongodb doc sizes and feel realistic
sqlite.pragma("synchronous = NORMAL");

export const HOBBIES = [
  "Reading",
  "Gaming",
  "Cooking",
  "Hiking",
  "Painting",
  "Cycling",
  "Photography",
  "Yoga",
  "Gardening",
  "Swimming",
  "Chess",
  "Knitting",
  "Surfing",
  "Dancing",
  "Coding",
  "Fishing",
  "Climbing",
  "Pottery",
  "Birdwatching",
  "Archery",
];

export const NATIONALITIES = [
  "American",
  "British",
  "French",
  "German",
  "Japanese",
  "Brazilian",
  "Canadian",
  "Australian",
  "Indian",
  "Chinese",
  "Mexican",
  "Italian",
  "Spanish",
  "Dutch",
  "Swedish",
];

export function seedAndInitialiseDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avatar TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      nationality TEXT NOT NULL,
      hobbies TEXT NOT NULL DEFAULT '[]'
    )
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_people_first_name ON people(first_name);
    CREATE INDEX IF NOT EXISTS idx_people_last_name ON people(last_name);
    CREATE INDEX IF NOT EXISTS idx_people_nationality ON people(nationality);
  `);

  const { count } = sqlite
    .prepare("SELECT COUNT(*) as count FROM people")
    .get() as { count: number };
  if (count > 0) return;

  console.log("Seeding database with 500 people…");

  const insertPersonStatement = sqlite.prepare(
    "INSERT INTO people (avatar, first_name, last_name, age, nationality, hobbies) VALUES (?, ?, ?, ?, ?, ?)",
  );

  const insertAllPeople = sqlite.transaction(
    (rows: Parameters<typeof insertPersonStatement.run>[]) => {
      for (const row of rows) insertPersonStatement.run(...row);
    },
  );

  const peopleRows = Array.from({ length: 500 }, (_, i) => {
    const hobbyCount = faker.number.int({ min: 0, max: 10 });
    return [
      `https://api.dicebear.com/9.x/avataaars/svg?seed=${i}`,
      faker.person.firstName(),
      faker.person.lastName(),
      faker.number.int({ min: 18, max: 80 }),
      faker.helpers.arrayElement(NATIONALITIES),
      JSON.stringify(faker.helpers.arrayElements(HOBBIES, hobbyCount)),
    ] as Parameters<typeof insertPersonStatement.run>;
  });

  insertAllPeople(peopleRows);
  console.log("Seeding complete.");
}
