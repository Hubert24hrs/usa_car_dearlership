import { serializeJsonLd } from "@/lib/seo";

export function JsonLd({ data }: { data: unknown }) {
  // serializeJsonLd escapes "<" so the payload cannot close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
