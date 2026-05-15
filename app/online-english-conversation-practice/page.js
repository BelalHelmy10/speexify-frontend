import SeoLandingPage from "@/app/SeoLandingPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("onlineEnglishConversationPractice", "en");

export default function OnlineEnglishConversationPracticePage() {
  return <SeoLandingPage pageKey="onlineEnglishConversationPractice" locale="en" />;
}
