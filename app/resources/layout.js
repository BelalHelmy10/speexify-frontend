import { noIndexMetadata } from "../seo";
import "@/styles/resources.scss";

export const metadata = noIndexMetadata("Resources", "/resources", "en");

export default function ResourcesLayout({ children }) {
  return children;
}
