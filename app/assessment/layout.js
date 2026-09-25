import { noIndexMetadata } from "../seo";
import "@/styles/assessment.scss";

export const metadata = noIndexMetadata("Assessment", "/assessment", "en");

export default function AssessmentLayout({ children }) {
  return children;
}
