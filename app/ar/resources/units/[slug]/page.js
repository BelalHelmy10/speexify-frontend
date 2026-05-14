import UnitPageContent from "../../../../resources/units/[slug]/UnitPageContent";

export const dynamic = "force-dynamic";

export default async function ArabicUnitPage({ params }) {
  return <UnitPageContent params={params} locale="ar" />;
}
