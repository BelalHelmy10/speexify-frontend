import { noIndexMetadata } from "@/app/seo";

export const metadata = noIndexMetadata("إعادة تعيين كلمة المرور", "/forgot-password", "ar");

export default function ArabicForgotPasswordLayout({ children }) {
  return children;
}
