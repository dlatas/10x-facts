export function getSafeNextPath(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('/\\')) return null;
  if (trimmed.includes('://')) return null;
  return trimmed;
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  window.location.assign('/login');
}
