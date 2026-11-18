// Tactile haptic feedback using navigator.vibrate
// Degrades gracefully on devices without haptic motors or in restricted contexts.

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "error";

export function isHapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("chess_haptics") !== "false";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem("chess_haptics", String(enabled));
  } catch {
    /* ignore storage errors */
  }
}

export function triggerHaptic(style: HapticStyle = "light"): void {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.vibrate) return;
  if (!isHapticsEnabled()) return;

  try {
    switch (style) {
      case "light":
        navigator.vibrate(12);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "heavy":
        navigator.vibrate(45);
        break;
      case "success":
        navigator.vibrate([15, 60, 25]);
        break;
      case "error":
        navigator.vibrate([30, 40, 30, 40, 50]);
        break;
    }
  } catch {
    // Vibration may be blocked by user gesture policy
  }
}
