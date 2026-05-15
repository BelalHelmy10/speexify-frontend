import SeoHubPage from "@/app/SeoHubPage";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata("blog", "ar");

export default function ArabicBlogPage() {
  return <SeoHubPage hubKey="blog" locale="ar" />;
}
