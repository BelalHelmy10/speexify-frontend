"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import HomeworkPlayer from "@/components/homework/HomeworkPlayer";
import HomeworkReview from "@/components/homework/HomeworkReview";
import { homeworkCopy, localeFromPath } from "@/components/homework/homeworkCopy";
import "@/styles/homework.scss";

export default function HomeworkDetailPage() {
  const { id } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = localeFromPath(pathname);
  const prefix = locale === "ar" ? "/ar" : "";
  const c = homeworkCopy(locale);
  const { user, checking } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", homework: null });

  useEffect(() => {
    if (checking || !user || !id) return;
    let alive = true;
    api
      .get(`/homework/${encodeURIComponent(id)}`)
      .then((res) => alive && setState({ loading: false, error: "", homework: res.data.homework }))
      .catch((e) => alive && setState({ loading: false, error: e?.response?.data?.error || c.loadError, homework: null }));
    return () => {
      alive = false;
    };
  }, [checking, user, id, c.loadError]);

  const hw = state.homework;
  return (
    <main className="container hw-page" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Link href={`${prefix}/dashboard/homework`} className="hw-back">
        <ArrowLeft size={16} aria-hidden className="hw-flip" /> {c.back}
      </Link>
      {(checking || state.loading) && <p className="hw-muted">{c.loading}</p>}
      {state.error && <p className="hw-error" role="alert">{state.error}</p>}
      {hw && hw.viewer === "teacher" && (
        <HomeworkReview homework={hw} locale={locale} onRemoved={() => router.push(`${prefix}/dashboard/homework`)} />
      )}
      {hw && hw.viewer !== "teacher" && <HomeworkPlayer homework={hw} locale={locale} />}
    </main>
  );
}
