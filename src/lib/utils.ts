import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clampTrimmed(value: string, maxLen: number): string {
  const t = value.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim();
}
