import SeoHubPage from "@/app/SeoHubPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("helpCenter", "en");

export default function HelpCenterPage() {
  return <SeoHubPage hubKey="helpCenter" locale="en" />;
}
