import SeoHubPage from "@/app/SeoHubPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("blog", "en");

export default function BlogPage() {
  return <SeoHubPage hubKey="blog" locale="en" />;
}
