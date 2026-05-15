import SeoLandingPage from "@/app/SeoLandingPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("businessEnglishTrainingCompanies", "en");

export default function BusinessEnglishTrainingCompaniesPage() {
  return <SeoLandingPage pageKey="businessEnglishTrainingCompanies" locale="en" />;
}
