// Lightweight one-shot sound playback, ported from stellar_strike's
// `new Audio(...).play()` pattern so multiple shots can overlap.
export function playSfx(src: string, volume = 1) {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    void audio.play().catch(() => {});
  } catch {
    /* autoplay can be blocked until the first user gesture; ignore */
  }
}

export const SFX = {
  rifle: "/audios/rifle.mp3",
  hurt: "/audios/hurt.mp3",
  dead: "/audios/dead.mp3",
} as const;
