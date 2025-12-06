import enHome from "../locales/en/home.json";
import arHome from "../locales/ar/home.json";

const dictionaries = {
  en: {
    home: enHome,
  },
  ar: {
    home: arHome,
  },
};

export function getDictionary(locale = "en", ns = "home") {
  return dictionaries[locale]?.[ns] || {};
}

export function t(dict, key) {
  return dict[key] ?? `__${key}__`;
}
