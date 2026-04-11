import { StepAnalyst } from '../../domain/biometrics/StepAnalyst';

export type StepCallback = (totalSteps: number) => void;

/**
 * MotionSensorAdapter
 * Infrastructure adapter for hardware motion sensors.
 * Handles the DeviceMotion API and iOS permission flow.
 */
export class MotionSensorAdapter {
  private analyst = new StepAnalyst();
  private totalSteps = 0;
  private onStep: StepCallback | null = null;
  private isactive = false;

  constructor(initialSteps = 0) {
    this.totalSteps = initialSteps;
  }

  /**
   * Request motion permission (Required for iOS Safari)
   * Must be called from a user gesture.
   */
  async requestPermission(): Promise<boolean> {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        return response === 'granted';
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }
    // Android/Desktop doesn't need explicit DeviceMotion permission usually
    return true;
  }

  /**
   * Starts tracking movement
   */
  start(onStep: StepCallback) {
    if (this.isactive) return;
    this.onStep = onStep;
    this.isactive = true;

    window.addEventListener('devicemotion', this.handleMotion, true);
  }

  /**
   * Stops tracking movement
   */
  stop() {
    window.removeEventListener('devicemotion', this.handleMotion, true);
    this.isactive = false;
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const { x, y, z } = acc;
    if (x === null || y === null || z === null) return;

    const detected = this.analyst.processSample(x, y, z);
    if (detected) {
      this.totalSteps++;
      if (this.onStep) {
        this.onStep(this.totalSteps);
      }
    }
  };

  /**
   * Returns current internal step count
   */
  getSteps(): number {
    return this.totalSteps;
  }
}
