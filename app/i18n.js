// app/i18n.js

import enHome from "../locales/en/home.json";
import arHome from "../locales/ar/home.json";
import enNav from "../locales/en/nav.json";
import arNav from "../locales/ar/nav.json";

const dictionaries = {
  en: {
    home: enHome,
    nav: enNav,
  },
  ar: {
    home: arHome,
    nav: arNav,
  },
};

export function getDictionary(locale = "en", ns = "home") {
  return dictionaries[locale]?.[ns] || {};
}

export function t(dict, key) {
  return dict[key] ?? `__${key}__`;
}
