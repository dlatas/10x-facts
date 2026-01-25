export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  // Prosta walidacja (UX). Backend i tak zweryfikuje format.
  return EMAIL_REGEX.test(v);
}

