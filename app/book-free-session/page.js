import { noIndexMetadata } from "@/app/seo";
import StarterSessionPage from "./StarterSessionPage";

export const metadata = noIndexMetadata("Book your free first session", "/book-free-session", "en");

export default function BookFreeSessionPage() {
  return <StarterSessionPage locale="en" />;
}
