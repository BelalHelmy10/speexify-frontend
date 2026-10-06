import { noIndexMetadata } from "../seo";
import "@/styles/calendar.scss";

export const metadata = noIndexMetadata("Calendar", "/calendar", "en");

export default function CalendarLayout({ children }) {
  return children;
}
