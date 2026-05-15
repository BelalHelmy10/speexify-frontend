import SeoLandingPage from "@/app/SeoLandingPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("englishPresentationCoaching", "ar");

export default function ArabicEnglishPresentationCoachingPage() {
  return <SeoLandingPage pageKey="englishPresentationCoaching" locale="ar" />;
}
