interface ConfettiOrigin {
  x: number;
  y: number;
}

export async function fireConfetti(args?: {
  origin?: ConfettiOrigin;
  particleCount?: number;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const origin = args?.origin ?? { x: 0.5, y: 0.25 };
  const particleCount = args?.particleCount ?? 110;

  // canvas-confetti jest browserowe — import dynamiczny (bezpieczne dla SSR).
  const mod = (await import('canvas-confetti')) as unknown as {
    default?: (opts: Record<string, unknown>) => void;
  };
  const confetti = mod.default;
  if (!confetti) return;

  // Dwa krótkie „strzały” wyglądają lepiej niż jeden duży.
  confetti({
    particleCount: Math.round(particleCount * 0.6),
    spread: 70,
    startVelocity: 45,
    decay: 0.92,
    scalar: 1,
    origin,
  });
  confetti({
    particleCount: Math.round(particleCount * 0.4),
    spread: 110,
    startVelocity: 35,
    decay: 0.93,
    scalar: 0.9,
    origin,
  });
}
