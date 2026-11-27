"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import UnitDetail from "@/components/units/UnitDetail";

export default function UnitPage({ params, searchParams }) {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const { unitId } = use(params);
  const query = use(searchParams);
  const learnerId = typeof query?.learner === "string" ? query.learner : null;
  return (
    <UnitDetail
      unitId={decodeURIComponent(unitId)}
      locale={locale}
      prefix={locale === "ar" ? "/ar" : ""}
      learnerId={learnerId}
    />
  );
}
