import Database from "better-sqlite3";

export function createTestDatabase() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE people (
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
    CREATE INDEX idx_people_first_name ON people(first_name);
    CREATE INDEX idx_people_last_name ON people(last_name);
    CREATE INDEX idx_people_nationality ON people(nationality);
  `);

  const insert = db.prepare(
    "INSERT INTO people (avatar, first_name, last_name, age, nationality, hobbies) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const seed = db.transaction(() => {
    insert.run("https://avatar.com/1.svg", "Alice", "Smith", 30, "British", JSON.stringify(["Reading", "Coding"]));
    insert.run("https://avatar.com/2.svg", "Bob", "Jones", 25, "American", JSON.stringify(["Gaming", "Hiking"]));
    insert.run("https://avatar.com/3.svg", "Clara", "Smith", 40, "French", JSON.stringify(["Cooking"]));
    insert.run("https://avatar.com/4.svg", "David", "Brown", 55, "American", JSON.stringify([]));
    insert.run("https://avatar.com/5.svg", "Eva", "White", 22, "British", JSON.stringify(["Yoga", "Swimming", "Dancing"]));
    // Extra people to test pagination
    for (let i = 6; i <= 25; i++) {
      insert.run(
        `https://avatar.com/${i}.svg`,
        `Person${i}`,
        `Last${i}`,
        20 + i,
        i % 2 === 0 ? "German" : "Japanese",
        JSON.stringify(i % 3 === 0 ? ["Chess"] : [])
      );
    }
  });

  seed();
  return db;
}
