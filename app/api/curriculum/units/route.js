// POST /api/curriculum/units  { ids: [resourceId, …] }
// Looks up which curriculum unit each class material belongs to, so the
// dashboard can group a learner's lessons into units. Only titles and
// ordering come back; the files themselves stay behind the resource pages.
import { NextResponse } from "next/server";
import { fetchSanity } from "@/lib/sanity";

const CACHE_MS = 60 * 60 * 1000;
const MAX_IDS = 400;
const resourceCache = new Map(); // resourceId -> { unitId, at }
const unitCache = new Map(); // unitId -> { unit, at }

const QUERY = `*[_type == "resource" && _id in $ids]{
  _id,
  "unit": unit->{
    _id,
    title,
    "slug": slug.current,
    summary,
    order,
    "bookLevel": bookLevel->{ _id, title, code, order, "book": book->{ _id, title, code, order } },
    "subLevel": subLevel->{ _id, title, code, order, "level": level->{ _id, name, code, order } },
    "materials": *[_type == "resource" && references(^._id)] | order(order asc) { _id, title, kind }
  }
}`;

const fresh = (entry) => entry && Date.now() - entry.at < CACHE_MS;

function cleanIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((id) => typeof id === "string" && id.trim() && id.length <= 200)
    .map((id) => id.trim());
  return [...new Set(ids)].slice(0, MAX_IDS);
}

export async function POST(request) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send { ids: [...] }" }, { status: 400 });
  }
  const ids = cleanIds(body?.ids);
  const missing = ids.filter((id) => !fresh(resourceCache.get(id)));

  if (missing.length) {
    try {
      const rows = await fetchSanity(QUERY, { ids: missing }, { queryName: "curriculum.unitsForResources" });
      const now = Date.now();
      const found = new Map((rows || []).map((row) => [row._id, row.unit || null]));
      for (const id of missing) {
        const unit = found.get(id) || null;
        resourceCache.set(id, { unitId: unit?._id || null, at: now });
        if (unit?._id) unitCache.set(unit._id, { unit, at: now });
      }
    } catch {
      return NextResponse.json({ error: "Curriculum lookup is unavailable" }, { status: 503 });
    }
  }

  const resources = {};
  const units = {};
  for (const id of ids) {
    const unitId = resourceCache.get(id)?.unitId || null;
    resources[id] = unitId;
    const unit = unitId ? unitCache.get(unitId)?.unit : null;
    if (unit) units[unitId] = unit;
  }
  return NextResponse.json({ resources, units });
}
