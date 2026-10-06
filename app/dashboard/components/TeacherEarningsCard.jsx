"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Coins, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { getDictionary, t } from "@/app/i18n";
import { getIntlLocale } from "@/utils/locale";

function formatEGP(minor, locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

export default function TeacherEarningsCard({ prefix = "", locale = "en" }) {
  const copy = getDictionary(locale, "earnings");
  const [summary, setSummary] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let active = true;
    api.get("/teacher/earnings", { params: { limit: 1, t: Date.now() } })
      .then(({ data }) => {
        if (active) {
          setSummary(data?.summary || null);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) {
          setSummary(null);
          setState("error");
        }
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="teacher-earnings-card" aria-labelledby="teacher-earnings-card-title">
      <div className="teacher-earnings-card__orb" aria-hidden="true" />
      <div className="teacher-earnings-card__topline">
        <span className="teacher-earnings-card__eyebrow">
          <Coins size={14} /> {t(copy, "eyebrow")}
        </span>
        <span className="teacher-earnings-card__currency">EGP</span>
      </div>
      <h3 id="teacher-earnings-card-title">{t(copy, "awaiting")}</h3>
      <div className="teacher-earnings-card__amount">
        {state === "loading" ? <Loader2 size={28} className="teacher-earnings-card__spin" /> : summary ? formatEGP(summary.pendingMinor, locale) : "—"}
      </div>
      <p>{state === "error" ? t(copy, "unavailable") : t(copy, "awaitingHint")}</p>
      <div className="teacher-earnings-card__footer">
        <span>{summary ? t(copy, "sessionCount", { count: summary.pendingCount || 0 }) : " "}</span>
        <Link href={`${prefix}/dashboard/earnings`}>
          {t(copy, "viewDetails")} <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
