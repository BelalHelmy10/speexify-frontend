// Private booking links must not be sent to monitoring in URLs or breadcrumbs.
export function redactTrialTelemetry(value) {
  const seen = new WeakSet();
  const clean = (entry, depth = 0) => {
    if (typeof entry === "string") return entry.replace(/#manage=[a-f0-9]{64}/gi, "#manage=[redacted]");
    if (!entry || typeof entry !== "object") return entry;
    if (seen.has(entry) || depth > 20) return "[omitted]";
    seen.add(entry);
    if (Array.isArray(entry)) return entry.map((item) => clean(item, depth + 1));
    return Object.fromEntries(Object.entries(entry).map(([key, item]) => [key,
      key === "token" && typeof item === "string" && /^[a-f0-9]{64}$/i.test(item) ? "[redacted]" : clean(item, depth + 1),
    ]));
  };
  return clean(value);
}
