// app/admin/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Admin from "@/legacy/pages/Admin";
import useAuth from "../../src/hooks/useAuth";
import Spinner from "../../src/components/Spinner";

function AdminGate({ children }) {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checking && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [checking, user, router]);

  if (checking || !user) {
    return <Spinner label="Checking access…" />;
  }

  if (user.role !== "admin") {
    // redirect in progress — prevent flicker
    return null;
  }

  return children;
}

export default function Page() {
  return (
    <>
      <AdminGate>
        <Admin />
      </AdminGate>
    </>
  );
}
