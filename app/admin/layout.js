import { noIndexMetadata } from "../seo";
import "@/styles/admin.scss";
import "@/styles/admin-availability.scss";

export const metadata = noIndexMetadata("Admin", "/admin", "en");

export default function AdminLayout({ children }) {
  return children;
}
