import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("تسجيل الدخول", "/login", "ar");

export default function ArabicLoginLayout({ children }) {
  return children;
}
