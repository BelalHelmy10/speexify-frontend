import SeoHubPage from "@/app/SeoHubPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("helpCenter", "ar");

export default function ArabicHelpCenterPage() {
  return <SeoHubPage hubKey="helpCenter" locale="ar" />;
}
