// app/resources/prep/page.js
import PrepPageContent from "./PrepPageContent";

export const dynamic = "force-dynamic";

export default async function PrepPage({ searchParams }) {
  return <PrepPageContent searchParams={searchParams} locale="en" />;
}
