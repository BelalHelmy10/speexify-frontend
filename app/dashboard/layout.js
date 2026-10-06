import { noIndexMetadata } from "../seo";
import "@/styles/dashboard.scss";
import "@/styles/earnings.scss";

export const metadata = noIndexMetadata("Dashboard", "/dashboard", "en");

export default function DashboardLayout({ children }) {
  return children;
}
