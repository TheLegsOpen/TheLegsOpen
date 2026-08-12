/**
 * Minimal in-memory stand-in for the slice of Payload's Local API the live-blog pipeline actually
 * calls (find/findByID/findGlobal/create/update/count on a handful of collections). Deliberately
 * NOT a real Payload instance -- initialising one outside the Next.js dev/build process hits the
 * documented Node 24 + @next/env bug that has blocked every standalone script this project, which
 * is exactly why this exists: it lets 2013-replay.test.ts drive generateLiveBlogPosts (the real
 * production hook, unmodified) against real data in milliseconds, with no live server and no
 * waiting on real wall-clock time.
 */

type Doc = Record<string, unknown> & { id: string };

type WhereClause = Record<string, unknown>;

function fieldValue(doc: Doc, field: string): unknown {
  const raw = doc[field];
  if (raw && typeof raw === "object" && "id" in (raw as Record<string, unknown>)) {
    return (raw as { id: unknown }).id;
  }
  return raw;
}

function matches(doc: Doc, where: WhereClause | undefined): boolean {
  if (!where) return true;
  if (Array.isArray(where.and)) return (where.and as WhereClause[]).every((w) => matches(doc, w));
  if (Array.isArray(where.or)) return (where.or as WhereClause[]).some((w) => matches(doc, w));

  for (const [field, condRaw] of Object.entries(where)) {
    if (field === "and" || field === "or") continue;
    const cond = condRaw as Record<string, unknown>;
    const value = fieldValue(doc, field);
    if ("equals" in cond && String(value) !== String(cond.equals)) return false;
    if ("not_equals" in cond && String(value) === String(cond.not_equals)) return false;
    if ("greater_than" in cond && !(Number(value) > Number(cond.greater_than))) return false;
    if ("greater_than_equal" in cond && !(Number(value) >= Number(cond.greater_than_equal))) return false;
    if ("less_than" in cond && !(Number(value) < Number(cond.less_than))) return false;
    if ("less_than_equal" in cond && !(Number(value) <= Number(cond.less_than_equal))) return false;
    if ("in" in cond && !(cond.in as unknown[]).some((v) => String(v) === String(value))) return false;
  }
  return true;
}

function sortDocs(docs: Doc[], sort?: string): Doc[] {
  if (!sort) return docs;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  const sorted = [...docs].sort((a, b) => {
    const av = String(fieldValue(a, field) ?? "");
    const bv = String(fieldValue(b, field) ?? "");
    return av < bv ? -1 : av > bv ? 1 : 0;
  });
  return desc ? sorted.reverse() : sorted;
}

export interface FakePayloadSeed {
  championships: Doc[];
  players: Doc[];
  venues: Doc[];
  scorecards: Doc[];
  "tee-time-rounds": Doc[];
  globals?: Record<string, Doc>;
}

/** Every collection the live-blog pipeline touches, plus the two it writes to. */
export type FakeCollection = keyof FakePayloadSeed | "live-blog-posts" | "live-blog-trigger-log";

export function createFakePayload(seed: FakePayloadSeed) {
  const store = new Map<string, Map<string, Doc>>();
  const register = (name: string, docs: Doc[]) => {
    const map = new Map<string, Doc>();
    for (const doc of docs) map.set(String(doc.id), doc);
    store.set(name, map);
  };
  register("championships", seed.championships);
  register("players", seed.players);
  register("venues", seed.venues);
  register("scorecards", seed.scorecards);
  register("tee-time-rounds", seed["tee-time-rounds"]);
  register("live-blog-posts", []);
  register("live-blog-trigger-log", []);

  const globals = seed.globals ?? {};
  let nextId = 1;

  function collection(name: FakeCollection): Map<string, Doc> {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  }

  return {
    liveBlogPosts: () => Array.from(collection("live-blog-posts").values()),
    liveBlogTriggerLog: () => Array.from(collection("live-blog-trigger-log").values()),

    /**
     * Test-harness-only escape hatch (not part of Payload's real Local API): replaces a doc by its
     * own known id, e.g. writing a scorecard's post-hole-update state into the DB the same way a
     * real save would, before the afterChange hook fires -- generate.ts's own leaderboard queries
     * must see the new state as "current" while `previousDoc` still carries the old one.
     */
    _seedWrite(name: FakeCollection, doc: Doc) {
      collection(name).set(String(doc.id), doc);
    },

    async find({ collection: name, where, sort, limit }: { collection: FakeCollection; where?: WhereClause; sort?: string; limit?: number }) {
      const all = Array.from(collection(name).values()).filter((doc) => matches(doc, where));
      const sorted = sortDocs(all, sort);
      const docs = limit ? sorted.slice(0, limit) : sorted;
      return { docs, totalDocs: all.length, hasNextPage: false };
    },

    async count({ collection: name, where }: { collection: FakeCollection; where?: WhereClause }) {
      const all = Array.from(collection(name).values()).filter((doc) => matches(doc, where));
      return { totalDocs: all.length };
    },

    async findByID({ collection: name, id }: { collection: FakeCollection; id: string }) {
      const doc = collection(name).get(String(id));
      if (!doc) throw new Error(`FakePayload: ${String(name)} ${id} not found`);
      return doc;
    },

    async findGlobal({ slug }: { slug: string }) {
      const global = globals[slug];
      if (!global) throw new Error(`FakePayload: global ${slug} not found`);
      return global;
    },

    async create({ collection: name, data }: { collection: FakeCollection; data: Record<string, unknown> }) {
      // Mirrors the real `fingerprint` unique index on live-blog-trigger-log -- evaluateAndPublish
      // relies on this throwing for an exact retry of the same candidate (see its DUPLICATE path).
      if (name === "live-blog-trigger-log" && typeof data.fingerprint === "string") {
        const clash = Array.from(collection(name).values()).some((doc) => doc.fingerprint === data.fingerprint);
        if (clash) throw new Error(`FakePayload: duplicate fingerprint ${data.fingerprint}`);
      }
      const id = String(nextId++);
      const now = new Date().toISOString();
      const doc: Doc = { id, ...data, createdAt: now, updatedAt: now };
      collection(name).set(id, doc);
      return doc;
    },

    async update({ collection: name, id, data }: { collection: FakeCollection; id: string; data: Record<string, unknown> }) {
      const existing = collection(name).get(String(id));
      if (!existing) throw new Error(`FakePayload: ${String(name)} ${id} not found`);
      const updated: Doc = { ...existing, ...data, updatedAt: new Date().toISOString() };
      collection(name).set(String(id), updated);
      return updated;
    },
  };
}

export type FakePayload = ReturnType<typeof createFakePayload>;
