import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RichTextBlock } from "@/components/shared/rich-text";

const text = (t: string) => ({ type: "text", text: t, format: 0, mode: "normal", style: "", detail: 0, version: 1 });
const paragraph = (t: string) => ({ type: "paragraph", children: [text(t)], format: "", indent: 0, version: 1, direction: null, textFormat: 0 });
const video = (fields: Record<string, unknown>) => ({ type: "block", version: 2, format: "", fields: { blockType: "video", id: "v1", blockName: "", ...fields } });
const doc = (...children: unknown[]) => ({ root: { type: "root", format: "", indent: 0, version: 1, direction: null, children } });
const render = (data: unknown) => renderToStaticMarkup(createElement(RichTextBlock, { data }));

describe("RichTextBlock video block", () => {
  it("plays a YouTube link between paragraphs, with its caption", () => {
    const html = render(doc(paragraph("Before."), video({ url: "https://youtu.be/abc123", caption: "The winning putt" }), paragraph("After.")));
    expect(html).toContain('src="https://www.youtube.com/embed/abc123"');
    expect(html).toContain("<figcaption");
    expect(html).toContain("The winning putt");
    expect(html.indexOf("Before.")).toBeLessThan(html.indexOf("youtube.com"));
    expect(html.indexOf("youtube.com")).toBeLessThan(html.indexOf("After."));
  });

  it("plays a Media video file in the browser's own player", () => {
    const html = render(doc(video({ file: { url: "/api/media/file/putt.mp4" } })));
    expect(html).toContain("<video");
    expect(html).toContain('src="/api/media/file/putt.mp4"');
  });

  it("renders nothing for a link that isn't a video", () => {
    const html = render(doc(video({ url: "https://example.com/page" })));
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<video");
  });
});
