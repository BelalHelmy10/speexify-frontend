import { noIndexMetadata } from "../seo";
import "@/styles/onboarding.scss";

export const metadata = noIndexMetadata("Onboarding", "/onboarding", "en");

export default function OnboardingLayout({ children }) {
  return children;
}
