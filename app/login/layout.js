import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("Log in", "/login", "en");

export default function LoginLayout({ children }) {
  return children;
}
