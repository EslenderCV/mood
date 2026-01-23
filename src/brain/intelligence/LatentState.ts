/**
 * Represents the hidden cognitive state of the user.
 * These variables modulate the "Physics" of the SessionVector movement.
 */
export interface LatentState {
  /**
   * 0.0 (Rigid) -> 1.0 (Fluid)
   * Determines how hard it is to change the current emotional trajectory.
   * High Inertia = User is deeply locked in a mood (requires strong signals to shift).
   * Low Inertia = User is exploring/fickle (responds quickly to new signals).
   */
  emotionalInertia: number;

  /**
   * 0.0 (Comfort Zone) -> 1.0 (Discovery Mode)
   * Modulates the Resonance Engine's repetition penalty.
   * High = System punishes repetition heavily.
   * Low = System favors familiar tracks/creators.
   */
  noveltyTolerance: number;

  /**
   * 0.0 (Passive/Vibing) -> 1.0 (Active/Searching)
   * Derived from scroll velocity and interaction frequency.
   * High Load = User is processing fast (Doomscrolling). Needs "Simpler" content.
   */
  cognitiveLoad: number;
}

export const DEFAULT_LATENT_STATE: LatentState = {
  emotionalInertia: 0.5,
  noveltyTolerance: 0.3,
  cognitiveLoad: 0.2,
};