"use client";

import { ToastProvider } from "@/components/ToastProvider";

export default function ClientProviders({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}
