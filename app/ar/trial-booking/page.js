import { noIndexMetadata } from "@/app/seo";
import TrialBookingPage from "@/components/trial/TrialBookingPage";
export const metadata = { ...noIndexMetadata("احجز جلستك التجريبية", "/ar/trial-booking", "ar"), referrer: "no-referrer" };
export default function Page() { return <TrialBookingPage locale="ar" />; }
