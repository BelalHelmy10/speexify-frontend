import { noIndexMetadata } from "../../seo";
import "@/styles/dashboard.scss";
import "@/styles/earnings.scss";
import "@/styles/notifications.scss";

export const metadata = noIndexMetadata("لوحة التحكم", "/dashboard", "ar");

export default function ArabicDashboardLayout({ children }) {
  return children;
}
