// app/i18n.js
import enHome from "@/locales/en/home.json";
import arHome from "@/locales/ar/home.json";

import enNav from "@/locales/en/nav.json";
import arNav from "@/locales/ar/nav.json";

import enAbout from "@/locales/en/about.json";
import arAbout from "@/locales/ar/about.json";

import enPackages from "@/locales/en/packages.json";
import arPackages from "@/locales/ar/packages.json";

import enContact from "@/locales/en/contact.json";
import arContact from "@/locales/ar/contact.json";

import enCorporate from "@/locales/en/corporate.json";
import arCorporate from "@/locales/ar/corporate.json";

import enIndividual from "@/locales/en/individual.json";
import arIndividual from "@/locales/ar/individual.json";

import enRegister from "@/locales/en/register.json";
import arRegister from "@/locales/ar/register.json";

import enLogin from "@/locales/en/login.json";
import arLogin from "@/locales/ar/login.json";

import enForgotPassword from "@/locales/en/forgot-password.json";
import arForgotPassword from "@/locales/ar/forgot-password.json";

import enCareers from "@/locales/en/careers.json";
import arCareers from "@/locales/ar/careers.json";

import enDashboard from "@/locales/en/dashboard.json";
import arDashboard from "@/locales/ar/dashboard.json";

import enCalendar from "@/locales/en/calendar.json";
import arCalendar from "@/locales/ar/calendar.json";

const dictionaries = {
  en: {
    home: enHome,
    nav: enNav,
    about: enAbout,
    packages: enPackages,
    contact: enContact,
    corporate: enCorporate,
    individual: enIndividual,
    register: enRegister,
    login: enLogin,
    forgotPassword: enForgotPassword,
    careers: enCareers,
    dashboard: enDashboard,
    calendar: enCalendar,
  },
  ar: {
    home: arHome,
    nav: arNav,
    about: arAbout,
    packages: arPackages,
    contact: arContact,
    corporate: arCorporate,
    individual: arIndividual,
    register: arRegister,
    login: arLogin,
    forgotPassword: arForgotPassword,
    careers: arCareers,
    dashboard: arDashboard,
    calendar: arCalendar,
  },
};

export function getDictionary(locale = "en", section) {
  const lang = locale === "ar" ? dictionaries.ar : dictionaries.en;
  return lang[section] || {};
}

export function t(dict, key, vars) {
  let value =
    dict && Object.prototype.hasOwnProperty.call(dict, key)
      ? dict[key]
      : `__${key}__`;

  if (vars && typeof value === "string") {
    Object.entries(vars).forEach(([k, v]) => {
      value = value.replace(new RegExp(`{${k}}`, "g"), String(v));
    });
  }

  return value;
}
