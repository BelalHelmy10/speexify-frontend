import SeoLandingPage from "@/app/SeoLandingPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("englishPresentationCoaching", "en");

export default function EnglishPresentationCoachingPage() {
  return <SeoLandingPage pageKey="englishPresentationCoaching" locale="en" />;
}
