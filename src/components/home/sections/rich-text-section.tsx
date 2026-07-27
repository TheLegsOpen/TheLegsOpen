import { Container } from "@/components/shared/container";
import type { RichTextSectionData } from "@/types/homepage-section";

export function RichTextSection({ section }: { section: RichTextSectionData }) {
  return (
    <section className="bg-background py-16 sm:py-24">
      <Container className="mx-auto flex max-w-2xl flex-col gap-5">
        {section.heading ? <h2 className="font-display font-bold text-display-md text-balance">{section.heading}</h2> : null}
        <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
          {section.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Container>
    </section>
  );
}
