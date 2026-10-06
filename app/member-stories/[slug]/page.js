import { notFound } from "next/navigation";
import MemberStoryDetailClient from "./MemberStoryDetailClient";

const VALID_STORY_SLUGS = ["sara", "ahmed", "yara"];
const VALID_STORY_SLUG_SET = new Set(VALID_STORY_SLUGS);

export const dynamicParams = false;

export function generateStaticParams() {
  return VALID_STORY_SLUGS.map((slug) => ({ slug }));
}

export default async function MemberStoryDetailPage({ params }) {
  const { slug } = await params;
  if (!VALID_STORY_SLUG_SET.has(slug)) notFound();

  return <MemberStoryDetailClient slug={slug} />;
}
