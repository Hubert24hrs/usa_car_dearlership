/**
 * Call after any inventory write (import, feed sync, admin edit, reprice):
 * invalidates cached pages/data and pushes changes to the optional search index.
 */
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "./cached";
import { syncMeilisearch } from "./keyword";

export async function afterInventoryChange(opts: { vins?: string[]; slugs?: string[] } = {}) {
  revalidateTag(CACHE_TAGS.inventory);
  for (const slug of opts.slugs ?? []) revalidatePath(`/inventory/${slug}`);
  revalidatePath("/sitemap.xml");
  await syncMeilisearch(opts.vins);
}
