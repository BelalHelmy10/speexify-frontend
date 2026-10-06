import { noIndexMetadata } from "../../seo";
import "@/styles/resources.scss";

export const metadata = noIndexMetadata("الموارد", "/resources", "ar");

export default function ArabicResourcesLayout({ children }) {
  return children;
}
