// Asks the site's server which curriculum unit each class material belongs to
// (see app/api/curriculum/units). Answers are kept for the page's lifetime.

const known = { resources: {}, units: {} };

export async function lookupUnits(ids = []) {
  const wanted = [...new Set(ids.filter(Boolean))];
  const missing = wanted.filter((id) => !(id in known.resources));
  if (missing.length) {
    const response = await fetch("/api/curriculum/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: missing }),
    });
    if (!response.ok) throw new Error(`Curriculum lookup failed (${response.status})`);
    const data = await response.json();
    Object.assign(known.resources, data.resources || {});
    Object.assign(known.units, data.units || {});
  }
  const resources = {};
  const units = {};
  for (const id of wanted) {
    const unitId = known.resources[id] || null;
    resources[id] = unitId;
    if (unitId && known.units[unitId]) units[unitId] = known.units[unitId];
  }
  return { resources, units };
}
