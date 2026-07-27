import { InfoCardGroup } from "@/components/home/sections/info-card-group";
import { CtaBanner } from "@/components/home/sections/cta-banner";
import { RichTextSection } from "@/components/home/sections/rich-text-section";
import type { HomepageSection } from "@/types/homepage-section";

export function HomepageSections({ sections }: { sections: HomepageSection[] }) {
  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case "infoCardGroup":
            return <InfoCardGroup key={section.id} section={section} />;
          case "ctaBanner":
            return <CtaBanner key={section.id} section={section} />;
          case "richText":
            return <RichTextSection key={section.id} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
