import { Container } from "@/components/shared/container";
import { RichTextBlock } from "@/components/shared/rich-text";
import type { RichTextSectionData } from "@/types/homepage-section";

export function RichTextSection({ section }: { section: RichTextSectionData }) {
  return (
    <section className="bg-background py-16 sm:py-24">
      <Container className="mx-auto flex max-w-2xl flex-col gap-5">
        {section.heading ? <h2 className="font-display font-bold text-display-md text-balance">{section.heading}</h2> : null}
        <RichTextBlock data={section.body} className="text-muted-foreground" />
      </Container>
    </section>
  );
}
