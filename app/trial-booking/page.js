import { noIndexMetadata } from "@/app/seo";
import TrialBookingPage from "@/components/trial/TrialBookingPage";
export const metadata = { ...noIndexMetadata("Book your trial", "/trial-booking", "en"), referrer: "no-referrer" };
export default function Page() { return <TrialBookingPage locale="en" />; }
