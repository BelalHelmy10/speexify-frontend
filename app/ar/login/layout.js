import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("سجّل دخول", "/login", "ar");

export default function ArabicLoginLayout({ children }) {
  return children;
}
