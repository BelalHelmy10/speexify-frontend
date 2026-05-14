import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Resources", "/resources", "en");

export default function ResourcesLayout({ children }) {
  return children;
}
