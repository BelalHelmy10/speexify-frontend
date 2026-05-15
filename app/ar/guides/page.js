import SeoHubPage from "@/app/SeoHubPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("guides", "ar");

export default function ArabicGuidesPage() {
  return <SeoHubPage hubKey="guides" locale="ar" />;
}
