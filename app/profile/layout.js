import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Profile", "/profile", "en");

export default function ProfileLayout({ children }) {
  return children;
}
