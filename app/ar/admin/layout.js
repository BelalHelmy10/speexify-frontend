import { noIndexMetadata } from "../../seo";

export const metadata = noIndexMetadata("الإدارة", "/admin", "ar");

export default function ArabicAdminLayout({ children }) {
  return children;
}
