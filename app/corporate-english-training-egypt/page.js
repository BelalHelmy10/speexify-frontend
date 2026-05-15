import SeoLandingPage from "@/app/SeoLandingPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("corporateEnglishTrainingEgypt", "en");

export default function CorporateEnglishTrainingEgyptPage() {
  return <SeoLandingPage pageKey="corporateEnglishTrainingEgypt" locale="en" />;
}
