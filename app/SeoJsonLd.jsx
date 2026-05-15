export default function SeoJsonLd({ data }) {
  const items = Array.isArray(data) ? data : [data].filter(Boolean);

  return items.map((item, index) => (
    <script
      key={index}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(item).replace(/</g, "\\u003c"),
      }}
    />
  ));
}
