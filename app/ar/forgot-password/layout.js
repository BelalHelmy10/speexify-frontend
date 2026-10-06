import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("غيّر الباسورد", "/forgot-password", "ar");

export default function ArabicForgotPasswordLayout({ children }) {
  return children;
}
