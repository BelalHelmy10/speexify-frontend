import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("Needs Analysis", "/needsanalysis", "en");

export default function NeedsAnalysisLayout({ children }) {
  return children;
}
