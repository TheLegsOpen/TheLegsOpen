export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export interface NavSection {
  label: string;
  href: string;
}

export interface NavPanelGroup {
  heading?: string;
  links: NavLink[];
  emphasis?: boolean;
}
