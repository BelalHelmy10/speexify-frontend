import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("Book your free first session", "/book-free-session", "en");

export default function BookFreeSessionLayout({ children }) {
  return children;
}
