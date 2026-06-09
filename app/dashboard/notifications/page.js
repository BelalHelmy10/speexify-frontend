"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import { copy } from "@/lib/notifications";

export default function NotificationsPage() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const t = copy(locale);

  // Only redirect when the session is *confirmed* invalid — not while we're
  // still checking or when the backend was briefly unreachable.
  if (authStatus === "unauthenticated") {
    router.replace("/login?next=/dashboard/notifications");
    return null;
  }

  return (
    <main className="spx-notif-page">
      <div className="spx-notif-page__inner">
        <header className="spx-notif-page__header">
          <Link href="/dashboard" className="spx-notif-page__back">
            <ArrowLeft size={18} />
            Dashboard
          </Link>
          <h1>{t.title}</h1>
        </header>

        <NotificationsPanel locale={locale} variant="page" open />
      </div>
    </main>
  );
}
