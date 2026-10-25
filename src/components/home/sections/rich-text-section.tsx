import { Container } from "@/components/shared/container";
import { SectionGrid } from "@/components/shared/section-grid";
import { RichTextBlock } from "@/components/shared/rich-text";
import type { RichTextSectionData } from "@/types/homepage-section";

export function RichTextSection({ section }: { section: RichTextSectionData }) {
  return (
    <section className="bg-background py-16 sm:py-24">
      <Container>
        {/* Heading in the narrow column, body in the wide one -- the broadsheet split, and the one
            band on the page whose two halves hold different kinds of content rather than two of the
            same thing.

            The body keeps the max-w-2xl it has always had rather than filling its 891px column. A
            column width is a layout decision; a line length is a reading one, and at 16px the full
            column runs to roughly 110 characters against the 45-75 that stays comfortable. The
            space left over is what the heading column is balanced against, not a gap to fill.

            Below `lg` SectionGrid collapses to one column, so this stacks heading-over-body exactly
            as it did before. */}
        <SectionGrid layout="side-main">
          {section.heading ? <h2 className="font-display font-bold text-display-md text-balance">{section.heading}</h2> : <div aria-hidden />}
          <RichTextBlock data={section.body} className="max-w-2xl text-muted-foreground" />
        </SectionGrid>
      </Container>
    </section>
  );
}
