import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Admin", "/admin", "en");

export default function AdminLayout({ children }) {
  return children;
}
