import SeoLandingPage from "@/app/SeoLandingPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("speakingCoachEgypt", "en");

export default function EnglishSpeakingCoachEgyptPage() {
  return <SeoLandingPage pageKey="speakingCoachEgypt" locale="en" />;
}
