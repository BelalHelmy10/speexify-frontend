import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Calendar", "/calendar", "en");

export default function CalendarLayout({ children }) {
  return children;
}
