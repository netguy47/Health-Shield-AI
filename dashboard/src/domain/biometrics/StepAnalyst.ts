/**
 * StepAnalyst
 * Domain agent responsible for signal processing of acceleration data.
 * Implements noise-cancellation and peak-detection algorithms.
 */
export class StepAnalyst {
  private threshold = 1.25; // m/s^2 above gravity baseline
  private minStepCooldown = 250; // ms between steps (max 4 steps/sec)
  private emaAlpha = 0.2; // Smoothing factor
  
  private lastStepTime = 0;
  private filteredMagnitude = 0;
  private isHigh = false;

  /**
   * Processes a single XYZ sample from the accelerometer.
   * Calculates magnitude, applies smoothing, and detects peaks.
   * Returns true if a step is detected.
   */
  processSample(x: number, y: number, z: number): boolean {
    const now = Date.now();
    
    // 1. Calculate Magnitude (Vector length)
    // Motion sensors usually provide data including gravity (9.8m/s^2)
    const rawMagnitude = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
    
    // 2. Exponential Moving Average (EMA) to smooth out noise
    this.filteredMagnitude = (this.emaAlpha * rawMagnitude) + 
                             ((1 - this.emaAlpha) * this.filteredMagnitude);

    // 3. Peak Detection Logic (Dynamic Thresholding)
    // We look for the signal crossing above (Threshold + Gravity) and then coming down.
    const gravityBaseline = 9.8;
    const currentActivity = Math.abs(this.filteredMagnitude - gravityBaseline);

    if (currentActivity > this.threshold && !this.isHigh) {
      // Possible start of a step peak
      if (now - this.lastStepTime > this.minStepCooldown) {
        this.isHigh = true;
        this.lastStepTime = now;
        return true; 
      }
    } else if (currentActivity < (this.threshold * 0.5)) {
      // Signal fell back below reset threshold
      this.isHigh = false;
    }

    return false;
  }

  /**
   * Resets the analyst state.
   */
  reset() {
    this.lastStepTime = 0;
    this.filteredMagnitude = 0;
    this.isHigh = false;
  }
}
