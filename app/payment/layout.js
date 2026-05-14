import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Payment", "/payment/success", "en");

export default function PaymentLayout({ children }) {
  return children;
}
