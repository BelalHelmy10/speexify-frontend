import { noIndexMetadata } from "../../seo";
import "@/styles/calendar.scss";

export const metadata = noIndexMetadata("التقويم", "/calendar", "ar");

export default function ArabicCalendarLayout({ children }) {
  return children;
}
