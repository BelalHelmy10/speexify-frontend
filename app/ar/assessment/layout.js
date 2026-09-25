import { noIndexMetadata } from "../../seo";
import "@/styles/assessment.scss";

export const metadata = noIndexMetadata("التقييم", "/assessment", "ar");

export default function ArabicAssessmentLayout({ children }) {
  return children;
}
