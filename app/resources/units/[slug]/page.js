// app/resources/units/[slug]/page.js
import UnitPageContent from "./UnitPageContent";

export const dynamic = "force-dynamic";

export default async function UnitPage({ params }) {
  return <UnitPageContent params={params} locale="en" />;
}
