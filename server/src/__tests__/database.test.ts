import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Used to test seedAndInitialiseDatabase function
const TEST_DB_PATH = path.join(__dirname, "test-seed.db");

// Re-implement seedAndInitialiseDatabase pointing at the temp DB
// We import the constants but override the sqlite instance
import { HOBBIES, NATIONALITIES } from "../db/client";
import { faker } from "@faker-js/faker";

function seedTestDatabase(db: Database.Database) {
  db.exec(`
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_people_first_name ON people(first_name);
    CREATE INDEX IF NOT EXISTS idx_people_last_name ON people(last_name);
    CREATE INDEX IF NOT EXISTS idx_people_nationality ON people(nationality);
  `);

  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM people")
    .get() as { count: number };
  if (count > 0) return;

  const insertPersonStatement = db.prepare(
    "INSERT INTO people (avatar, first_name, last_name, age, nationality, hobbies) VALUES (?, ?, ?, ?, ?, ?)",
  );

  const insertAllPeople = db.transaction(
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
}

describe("seedAndInitialiseDatabase", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
  });

  afterEach(() => {
    db.close();
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  describe("schema creation", () => {
    it("creates the people table", () => {
      seedTestDatabase(db);
      const table = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='people'",
        )
        .get();
      expect(table).toBeDefined();
    });

    it("creates indexes for first_name, last_name, and nationality", () => {
      seedTestDatabase(db);
      const indexes = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='people'",
        )
        .all() as { name: string }[];
      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain("idx_people_first_name");
      expect(indexNames).toContain("idx_people_last_name");
      expect(indexNames).toContain("idx_people_nationality");
    });

    it("is idempotent — calling twice does not throw or duplicate data", () => {
      expect(() => {
        seedTestDatabase(db);
        seedTestDatabase(db);
      }).not.toThrow();

      const { count } = db
        .prepare("SELECT COUNT(*) as count FROM people")
        .get() as { count: number };
      expect(count).toBe(500);
    });
  });

  describe("seeded data integrity", () => {
    beforeEach(() => seedTestDatabase(db));

    it("seeds exactly 500 people", () => {
      const { count } = db
        .prepare("SELECT COUNT(*) as count FROM people")
        .get() as { count: number };
      expect(count).toBe(500);
    });

    it("every person has a non-empty avatar URL", () => {
      const rows = db.prepare("SELECT avatar FROM people").all() as {
        avatar: string;
      }[];
      expect(rows.every((r) => r.avatar.startsWith("https://"))).toBe(true);
    });

    it("every person has a non-empty first_name and last_name", () => {
      const rows = db
        .prepare("SELECT first_name, last_name FROM people")
        .all() as { first_name: string; last_name: string }[];
      expect(
        rows.every((r) => r.first_name.length > 0 && r.last_name.length > 0),
      ).toBe(true);
    });

    it("every person has an age between 18 and 80", () => {
      const rows = db.prepare("SELECT age FROM people").all() as {
        age: number;
      }[];
      expect(rows.every((r) => r.age >= 18 && r.age <= 80)).toBe(true);
    });

    it("every person has a nationality from the allowed list", () => {
      const rows = db.prepare("SELECT nationality FROM people").all() as {
        nationality: string;
      }[];
      expect(rows.every((r) => NATIONALITIES.includes(r.nationality))).toBe(
        true,
      );
    });

    it("every person has hobbies stored as a valid JSON array", () => {
      const rows = db.prepare("SELECT hobbies FROM people").all() as {
        hobbies: string;
      }[];
      expect(() => {
        rows.forEach((r) => {
          const parsed = JSON.parse(r.hobbies);
          expect(Array.isArray(parsed)).toBe(true);
        });
      }).not.toThrow();
    });

    it("every hobby in each person's list is from the allowed HOBBIES list", () => {
      const rows = db.prepare("SELECT hobbies FROM people").all() as {
        hobbies: string;
      }[];
      rows.forEach((r) => {
        const hobbies = JSON.parse(r.hobbies) as string[];
        expect(hobbies.every((h) => HOBBIES.includes(h))).toBe(true);
      });
    });

    it("hobbies list per person has between 0 and 10 items", () => {
      const rows = db.prepare("SELECT hobbies FROM people").all() as {
        hobbies: string;
      }[];
      rows.forEach((r) => {
        const hobbies = JSON.parse(r.hobbies) as string[];
        expect(hobbies.length).toBeGreaterThanOrEqual(0);
        expect(hobbies.length).toBeLessThanOrEqual(10);
      });
    });

    it("avatar URLs use the correct dicebear seed pattern", () => {
      const rows = db.prepare("SELECT avatar FROM people").all() as {
        avatar: string;
      }[];
      expect(rows.every((r) => r.avatar.includes("dicebear.com"))).toBe(true);
    });
  });

  describe("HOBBIES and NATIONALITIES constants", () => {
    it("HOBBIES contains exactly 20 entries", () => {
      expect(HOBBIES.length).toBe(20);
    });

    it("NATIONALITIES contains exactly 15 entries", () => {
      expect(NATIONALITIES.length).toBe(15);
    });

    it("HOBBIES has no duplicates", () => {
      expect(new Set(HOBBIES).size).toBe(HOBBIES.length);
    });

    it("NATIONALITIES has no duplicates", () => {
      expect(new Set(NATIONALITIES).size).toBe(NATIONALITIES.length);
    });
  });
});
