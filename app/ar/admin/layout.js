import { noIndexMetadata } from "../../seo";
import "@/styles/admin.scss";
import "@/styles/admin-availability.scss";

export const metadata = noIndexMetadata("الإدارة", "/admin", "ar");

export default function ArabicAdminLayout({ children }) {
  return children;
}
