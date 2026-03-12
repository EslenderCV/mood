/**
 * Core mathematical representation of user emotion.
 * Range: [0.0, 1.0] for both Energy (Intensity) and Valence (Positivity).
 */
export class SessionVector {
  private _energy: number;
  private _valence: number;

  constructor(energy: number = 0.5, valence: number = 0.5) {
    this._energy = this.clamp(energy);
    this._valence = this.clamp(valence);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  public get energy(): number {
    return this._energy;
  }

  public get valence(): number {
    return this._valence;
  }

  /**
   * Explicitly sets the vector values.
   * Used when the PredictiveEngine calculates a precise target coordinate.
   */
  public set(energy: number, valence: number): void {
    this._energy = this.clamp(energy);
    this._valence = this.clamp(valence);
  }

  /**
   * Updates the vector towards a target (Content-Based Filtering).
   * @param target The target coordinates
   * @param alpha Learning rate (0.0 - 1.0)
   */
  public moveTowards(target: { energy: number; valence: number }, alpha: number): void {
    this._energy = this.clamp(this._energy + alpha * (target.energy - this._energy));
    this._valence = this.clamp(this._valence + alpha * (target.valence - this._valence));
  }

  /**
   * Applies a directional push directly to the vector (Heuristic-Based Filtering).
   * @param delta The direction to push { energyDelta, valenceDelta }
   * @param weight The strength of this push (0.0 - 1.0)
   */
  public applyDelta(delta: { energyDelta: number; valenceDelta: number }, weight: number): void {
    this._energy = this.clamp(this._energy + (delta.energyDelta * weight));
    this._valence = this.clamp(this._valence + (delta.valenceDelta * weight));
  }

  public distanceTo(other: { energy: number; valence: number }): number {
    return Math.sqrt(
      Math.pow(this._energy - other.energy, 2) + 
      Math.pow(this._valence - other.valence, 2)
    );
  }

  public toJSON() {
    return {
      energy: Number(this._energy.toFixed(4)),
      valence: Number(this._valence.toFixed(4)),
    };
  }

  public clone(): SessionVector {
    return new SessionVector(this._energy, this._valence);
  }
}