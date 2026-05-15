import SeoHubPage from "@/app/SeoHubPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("guides", "en");

export default function GuidesPage() {
  return <SeoHubPage hubKey="guides" locale="en" />;
}
