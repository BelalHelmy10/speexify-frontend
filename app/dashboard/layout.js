import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Dashboard", "/dashboard", "en");

export default function DashboardLayout({ children }) {
  return children;
}
