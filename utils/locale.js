/**
 * Locale helpers for user-facing formatting.
 *
 * Arabic pages use Egyptian Arabic with Arabic-Indic digits. Keeping this in
 * one place prevents individual screens from falling back to Latin digits.
 */
export function getIntlLocale(locale = "en") {
  return String(locale).toLowerCase().startsWith("ar")
    ? "ar-EG-u-nu-arab"
    : "en-US";
}

export function formatNumber(value, locale = "en", options = {}) {
  try {
    return new Intl.NumberFormat(getIntlLocale(locale), options).format(value);
  } catch {
    return String(value ?? "");
  }
}
