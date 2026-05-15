import SeoLandingPage from "@/app/SeoLandingPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("businessEnglishTrainingCompanies", "ar");

export default function ArabicBusinessEnglishTrainingCompaniesPage() {
  return <SeoLandingPage pageKey="businessEnglishTrainingCompanies" locale="ar" />;
}
