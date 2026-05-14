import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("Create an Account", "/register", "en");

export default function RegisterLayout({ children }) {
  return children;
}
