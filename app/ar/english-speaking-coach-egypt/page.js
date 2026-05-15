import SeoLandingPage from "@/app/SeoLandingPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("speakingCoachEgypt", "ar");

export default function ArabicEnglishSpeakingCoachEgyptPage() {
  return <SeoLandingPage pageKey="speakingCoachEgypt" locale="ar" />;
}
