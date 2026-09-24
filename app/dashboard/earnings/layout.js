import { noIndexMetadata } from "../../seo";

export const metadata = noIndexMetadata("Teacher earnings", "/dashboard/earnings", "en");

export default function EarningsLayout({ children }) {
  return children;
}
