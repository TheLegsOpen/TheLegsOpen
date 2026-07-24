import { revalidatePath } from "next/cache";

/**
 * Payload afterChange/afterDelete hook — every page is nested under the
 * root layout, and content edited in the admin panel is rarely so frequent
 * that a blanket revalidation is a real cost, so this just invalidates
 * everything rather than tracking which specific routes a given document
 * affects (a venue alone touches /venues, /venues/[slug], sitemap.xml,
 * tickets-and-hospitality/[year] and previous-opens/[year]).
 */
export function revalidateSite() {
  revalidatePath("/", "layout");
}
