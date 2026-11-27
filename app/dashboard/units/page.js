"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import UnitsOverview from "@/components/units/UnitsOverview";

export default function UnitsPage({ searchParams }) {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const query = use(searchParams);
  const learnerId = typeof query?.learner === "string" ? query.learner : null;
  return <UnitsOverview locale={locale} prefix={locale === "ar" ? "/ar" : ""} learnerId={learnerId} />;
}
