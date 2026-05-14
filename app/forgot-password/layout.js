import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("Reset Password", "/forgot-password", "en");

export default function ForgotPasswordLayout({ children }) {
  return children;
}
