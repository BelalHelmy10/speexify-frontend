import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Assessment", "/assessment", "en");

export default function AssessmentLayout({ children }) {
  return children;
}
