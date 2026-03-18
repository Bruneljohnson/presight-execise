import { Router } from "express";
import { Database } from "better-sqlite3";

interface PersonRow {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string;
}

function buildFilterWhereClause(
  search: string,
  nationalities: string[],
  hobbies: string[],
): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push("(first_name LIKE ? OR last_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (nationalities.length) {
    conditions.push(
      `nationality IN (${nationalities.map(() => "?").join(",")})`,
    );
    params.push(...nationalities);
  }
  if (hobbies.length) {
    conditions.push(`(${hobbies.map(() => "hobbies LIKE ?").join(" OR ")})`);
    params.push(...hobbies.map((h) => `%"${h}"%`));
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export function createPeopleRouter(db: Database) {
  const router = Router();

  const fetchTopNationalitiesStatement = db.prepare<
    [],
    { name: string; count: number }
  >(
    "SELECT nationality as name, COUNT(*) as count FROM people GROUP BY nationality ORDER BY count DESC LIMIT 20",
  );
  const fetchAllHobbiesStatement = db.prepare<[], { hobbies: string }>(
    "SELECT hobbies FROM people",
  );

  router.get("/", (req, res) => {
    const rawPage = Number(req.query.page);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const rawLimit = Number(req.query.limit);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
    const search = String(req.query.search ?? "").trim();
    const hobbies = req.query.hobbies
      ? String(req.query.hobbies).split(",").filter(Boolean)
      : [];
    const nationalities = req.query.nationalities
      ? String(req.query.nationalities).split(",").filter(Boolean)
      : [];

    const offset = (page - 1) * limit;
    const { where, params } = buildFilterWhereClause(
      search,
      nationalities,
      hobbies,
    );

    const { total } = db
      .prepare<
        unknown[],
        { total: number }
      >(`SELECT COUNT(*) as total FROM people ${where}`)
      .get(...params)!;

    const rows = db
      .prepare<
        unknown[],
        PersonRow
      >(`SELECT id, avatar, first_name, last_name, age, nationality, hobbies FROM people ${where} ORDER BY id LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);

    const data = rows.map((r) => ({
      ...r,
      hobbies: JSON.parse(r.hobbies) as string[],
    }));

    res.json({
      data,
      total,
      page,
      limit,
      hasMore: offset + data.length < total,
    });
  });

  router.get("/meta", (_req, res) => {
    const topNationalities = fetchTopNationalitiesStatement.all();

    const hobbyCounts: Record<string, number> = {};
    for (const { hobbies } of fetchAllHobbiesStatement.all()) {
      for (const h of JSON.parse(hobbies) as string[]) {
        hobbyCounts[h] = (hobbyCounts[h] ?? 0) + 1;
      }
    }

    const topHobbies = Object.entries(hobbyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    res.json({ topHobbies, topNationalities });
  });

  return router;
}
