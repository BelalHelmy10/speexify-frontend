import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Onboarding", "/onboarding", "en");

export default function OnboardingLayout({ children }) {
  return children;
}
