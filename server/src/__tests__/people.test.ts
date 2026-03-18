import request from "supertest";
import express, { type Request, type Response, type NextFunction } from "express";
import { createTestDatabase } from "./testDatabase";
import { createPeopleRouter } from "../routes/people";
import type { Database } from "better-sqlite3";

let db: Database;
let app: ReturnType<typeof express>;

beforeAll(() => {
  db = createTestDatabase();
  const testApp = express();
  testApp.use(express.json());
  testApp.use("/api/people", createPeopleRouter(db));
  testApp.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });
  app = testApp;
});

afterAll(() => {
  db.close();
});

describe("GET /api/people", () => {
  describe("pagination", () => {
    it("returns first page with default limit of 20", async () => {
      const res = await request(app).get("/api/people");
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.data.length).toBe(20);
      expect(res.body.total).toBe(25);
      expect(res.body.hasMore).toBe(true);
    });

    it("returns second page with remaining records", async () => {
      const res = await request(app).get("/api/people?page=2");
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.data.length).toBe(5);
      expect(res.body.hasMore).toBe(false);
    });

    it("respects custom limit", async () => {
      const res = await request(app).get("/api/people?limit=5");
      expect(res.body.data.length).toBe(5);
      expect(res.body.limit).toBe(5);
      expect(res.body.hasMore).toBe(true);
    });

    it("clamps limit to maximum of 100", async () => {
      const res = await request(app).get("/api/people?limit=999");
      expect(res.body.limit).toBe(100);
    });

    it("clamps limit to minimum of 1", async () => {
      const res = await request(app).get("/api/people?limit=0");
      expect(res.body.limit).toBe(1);
    });

    it("clamps page to minimum of 1 for negative values", async () => {
      const res = await request(app).get("/api/people?page=-5");
      expect(res.body.page).toBe(1);
    });

    it("returns empty data array for page beyond total", async () => {
      const res = await request(app).get("/api/people?page=999");
      expect(res.body.data).toEqual([]);
      expect(res.body.hasMore).toBe(false);
    });

    it("returns hasMore false when on last page exactly", async () => {
      const res = await request(app).get("/api/people?page=5&limit=5");
      expect(res.body.data.length).toBe(5);
      expect(res.body.hasMore).toBe(false);
    });
  });

  describe("response shape", () => {
    it("returns all required fields on each person", async () => {
      const res = await request(app).get("/api/people?limit=1");
      const person = res.body.data[0];
      expect(person).toHaveProperty("id");
      expect(person).toHaveProperty("avatar");
      expect(person).toHaveProperty("first_name");
      expect(person).toHaveProperty("last_name");
      expect(person).toHaveProperty("age");
      expect(person).toHaveProperty("nationality");
      expect(person).toHaveProperty("hobbies");
    });

    it("parses hobbies as an array not a JSON string", async () => {
      const res = await request(app).get("/api/people?limit=1");
      expect(Array.isArray(res.body.data[0].hobbies)).toBe(true);
    });

    it("returns hobbies as empty array for people with no hobbies", async () => {
      const res = await request(app).get("/api/people?search=David");
      const david = res.body.data[0];
      expect(david.hobbies).toEqual([]);
    });
  });

  describe("search", () => {
    it("filters by first_name", async () => {
      const res = await request(app).get("/api/people?search=Alice");
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].first_name).toBe("Alice");
    });

    it("filters by last_name", async () => {
      const res = await request(app).get("/api/people?search=Jones");
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].last_name).toBe("Jones");
    });

    it("is case-insensitive", async () => {
      const res = await request(app).get("/api/people?search=alice");
      expect(res.body.data.length).toBe(1);
    });

    it("returns multiple matches for partial search", async () => {
      const res = await request(app).get("/api/people?search=Smith");
      expect(res.body.data.length).toBe(2);
    });

    it("returns empty data for no matches", async () => {
      const res = await request(app).get("/api/people?search=zzznomatch");
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.hasMore).toBe(false);
    });

    it("trims whitespace from search term", async () => {
      const res = await request(app).get("/api/people?search=  Alice  ");
      expect(res.body.data.length).toBe(1);
    });

    it("ignores empty search string and returns all records", async () => {
      const res = await request(app).get("/api/people?search=");
      expect(res.body.total).toBe(25);
    });
  });

  describe("nationality filter", () => {
    it("filters by a single nationality", async () => {
      const res = await request(app).get("/api/people?nationalities=British");
      expect(res.body.data.every((p: { nationality: string }) => p.nationality === "British")).toBe(true);
    });

    it("filters by multiple nationalities", async () => {
      const res = await request(app).get("/api/people?nationalities=British,American");
      const nationalities = res.body.data.map((p: { nationality: string }) => p.nationality);
      expect(nationalities.every((n: string) => ["British", "American"].includes(n))).toBe(true);
    });

    it("returns empty data for nationality with no matches", async () => {
      const res = await request(app).get("/api/people?nationalities=Martian");
      expect(res.body.data).toEqual([]);
    });
  });

  describe("hobby filter", () => {
    it("filters by a single hobby", async () => {
      const res = await request(app).get("/api/people?hobbies=Reading");
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(
        res.body.data.every((p: { hobbies: string[] }) => p.hobbies.includes("Reading"))
      ).toBe(true);
    });

    it("filters by multiple hobbies using OR logic", async () => {
      const res = await request(app).get("/api/people?hobbies=Reading,Gaming");
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(
        res.body.data.every((p: { hobbies: string[] }) =>
          p.hobbies.includes("Reading") || p.hobbies.includes("Gaming")
        )
      ).toBe(true);
    });

    it("returns empty data for hobby with no matches", async () => {
      const res = await request(app).get("/api/people?hobbies=Skydiving");
      expect(res.body.data).toEqual([]);
    });
  });

  describe("combined filters", () => {
    it("combines search and nationality filter", async () => {
      const res = await request(app).get("/api/people?search=Smith&nationalities=British");
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].first_name).toBe("Alice");
    });

    it("combines nationality and hobby filter", async () => {
      const res = await request(app).get("/api/people?nationalities=British&hobbies=Yoga");
      expect(res.body.data.every((p: { nationality: string; hobbies: string[] }) =>
        p.nationality === "British" && p.hobbies.includes("Yoga")
      )).toBe(true);
    });

    it("returns empty when combined filters have no intersection", async () => {
      const res = await request(app).get("/api/people?search=Alice&nationalities=American");
      expect(res.body.data).toEqual([]);
    });
  });

  describe("invalid query params", () => {
    it("handles non-numeric page gracefully defaulting to page 1", async () => {
      const res = await request(app).get("/api/people?page=abc");
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
    });

    it("handles non-numeric limit gracefully defaulting to 20", async () => {
      const res = await request(app).get("/api/people?limit=abc");
      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(20);
    });
  });
});

describe("GET /api/people/meta", () => {
  it("returns topHobbies and topNationalities", async () => {
    const res = await request(app).get("/api/people/meta");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("topHobbies");
    expect(res.body).toHaveProperty("topNationalities");
  });

  it("topNationalities are sorted by count descending", async () => {
    const res = await request(app).get("/api/people/meta");
    const counts = res.body.topNationalities.map((n: { count: number }) => n.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("topHobbies are sorted by count descending", async () => {
    const res = await request(app).get("/api/people/meta");
    const counts = res.body.topHobbies.map((h: { count: number }) => h.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("topNationalities contain name and count fields", async () => {
    const res = await request(app).get("/api/people/meta");
    const first = res.body.topNationalities[0];
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("count");
  });

  it("topHobbies contain name and count fields", async () => {
    const res = await request(app).get("/api/people/meta");
    const first = res.body.topHobbies[0];
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("count");
  });

  it("returns at most 20 nationalities", async () => {
    const res = await request(app).get("/api/people/meta");
    expect(res.body.topNationalities.length).toBeLessThanOrEqual(20);
  });

  it("returns at most 20 hobbies", async () => {
    const res = await request(app).get("/api/people/meta");
    expect(res.body.topHobbies.length).toBeLessThanOrEqual(20);
  });

  it("does not include hobbies from people with empty hobby lists", async () => {
    const res = await request(app).get("/api/people/meta");
    const hobbyNames = res.body.topHobbies.map((h: { name: string }) => h.name);
    expect(hobbyNames).not.toContain("");
  });
});
