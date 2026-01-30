export type NavLinkId = 'dashboard' | 'collections' | 'favorites';

export interface NavLink {
  id: NavLinkId;
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard' },
  { id: 'collections', href: '/collections', label: 'Kolekcje' },
  { id: 'favorites', href: '/favorites', label: 'Ulubione' },
];
