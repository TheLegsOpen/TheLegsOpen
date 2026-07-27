/** Shared curated icon set for admin-editable "icon + title + description" cards (Media, Careers). */
export const ICON_OPTIONS = [
  "Trophy",
  "Compass",
  "HeartHandshake",
  "FileText",
  "Image",
  "Mail",
  "Shield",
  "Star",
  "Users",
  "Megaphone",
] as const;

export type IconOption = (typeof ICON_OPTIONS)[number];
