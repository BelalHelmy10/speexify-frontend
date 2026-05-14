import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Manual Payment", "/manual-payment", "en");

export default function ManualPaymentLayout({ children }) {
  return children;
}
