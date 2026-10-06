import { noIndexMetadata } from "../../seo";
import "@/styles/onboarding.scss";

export const metadata = noIndexMetadata("إعداد الحساب", "/onboarding", "ar");

export default function ArabicOnboardingLayout({ children }) {
  return children;
}
