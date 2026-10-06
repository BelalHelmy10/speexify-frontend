import HomeAuthRedirect from "./HomeAuthRedirect";
import HomePageContent from "./HomePageContent";
import { pageMetadata } from "./seo";
import "@/styles/home.scss";

export const metadata = pageMetadata("home", "en");

export default function Page({ locale = "en" }) {
  return (
    <>
      <HomeAuthRedirect locale={locale} />
      <HomePageContent locale={locale} />
    </>
  );
}
