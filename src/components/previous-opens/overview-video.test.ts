import { describe, expect, it } from "vitest";

import { hostedVideoUrl, toEmbedUrl } from "@/components/previous-opens/overview-video";

describe("hostedVideoUrl", () => {
  it.each([
    ["/api/media/file/Leisegang%20winning%20putt%202026.mp4", "/api/media/file/Leisegang%20winning%20putt%202026.mp4"],
    ["  /api/media/file/clip.mp4 ", "/api/media/file/clip.mp4"],
    ["https://thelegsopen.com/api/media/file/clip.mp4", "/api/media/file/clip.mp4"],
    ["https://www.thelegsopen.com/api/media/file/clip.mp4", "/api/media/file/clip.mp4"],
    ["https://cdn.example.com/films/final-putt.MP4", "https://cdn.example.com/films/final-putt.MP4"],
  ])("plays %s as a file", (input, expected) => {
    expect(hostedVideoUrl(input)).toBe(expected);
  });

  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://vimeo.com/123456789"],
    ["http://example.com/video.mp4"],
    ["not a url"],
  ])("leaves %s to the embed path", (input) => {
    expect(hostedVideoUrl(input)).toBeNull();
  });
});

describe("toEmbedUrl", () => {
  // Editors paste what is in the address bar. Every shape of that has to work, because the
  // failure is silent: an un-embeddable URL in an iframe renders a blank grey box.
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["  https://youtu.be/dQw4w9WgXcQ  ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/123456789", "https://player.vimeo.com/video/123456789"],
  ])("converts %s", (input, expected) => {
    expect(toEmbedUrl(input)).toBe(expected);
  });

  it("leaves an embed link alone", () => {
    expect(toEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(toEmbedUrl("https://player.vimeo.com/video/123456789")).toBe("https://player.vimeo.com/video/123456789");
  });

  // Returning null is what stops the blank box: the component renders nothing at all.
  it.each([
    ["not a url", "plain text"],
    ["https://example.com/video.mp4", "a host we cannot embed"],
    ["https://www.youtube.com/watch", "a watch link with no id"],
    ["https://vimeo.com/channels/staffpicks", "a vimeo page that is not a video"],
    ["https://youtu.be/", "a short link with no id"],
  ])("refuses %s (%s)", (input) => {
    expect(toEmbedUrl(input)).toBeNull();
  });
});
