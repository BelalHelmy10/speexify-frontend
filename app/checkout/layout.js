import { noIndexMetadata } from "../seo";

export const metadata = noIndexMetadata("Checkout", "/checkout", "en");

export default function CheckoutLayout({ children }) {
  return children;
}
