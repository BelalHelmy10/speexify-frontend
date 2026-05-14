// app/ar/resources/prep/page.js
import PrepPageContent from "../../../resources/prep/PrepPageContent";

export default async function ArabicPrepPage({ searchParams }) {
  return <PrepPageContent searchParams={searchParams} locale="ar" />;
}
