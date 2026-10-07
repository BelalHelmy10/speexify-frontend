import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("Book your free session", "/book-free-session", "en");

export default function BookFreeSessionLayout({ children }) {
  return children;
}
