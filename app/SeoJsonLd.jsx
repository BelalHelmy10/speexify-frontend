import { headers } from "next/headers";

export default async function SeoJsonLd({ data }) {
  const items = Array.isArray(data) ? data : [data].filter(Boolean);
  const nonce = (await headers()).get("x-nonce") || undefined;

  return items.map((item, index) => (
    <script
      key={index}
      nonce={nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(item).replace(/</g, "\\u003c"),
      }}
    />
  ));
}
