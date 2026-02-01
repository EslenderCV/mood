// Design System v1 — haptics policy
// Centralize haptic usage so it stays subtle and consistent.

import * as Haptics from "expo-haptics";

export type HapticKind = "selection" | "light" | "medium" | "success" | "error" | "none";

/**
 * Trigger haptic feedback without blocking UI.
 * Never await this in hot paths (scroll, animations).
 */
export function haptic(kind: HapticKind) {
  if (kind === "none") return;

  try {
    switch (kind) {
      case "selection":
        void Haptics.selectionAsync();
        return;
      case "light":
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      case "medium":
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      case "success":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      case "error":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
    }
  } catch {
    // Best-effort only; never crash the app because of haptics.
  }
}
