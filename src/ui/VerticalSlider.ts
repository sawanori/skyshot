/**
 * VerticalSlider.ts - Altitude control slider UI
 *
 * Features:
 * - Visual slider on right edge
 * - Current altitude indicator
 * - Touch zone highlighting
 *
 * TODO: Implement altitude slider visualization
 */

export interface SliderConfig {
  width: number;
  height: string;
  backgroundColor: string;
  trackColor: string;
  handleColor: string;
  minLabel: string;
  maxLabel: string;
}

export class VerticalSlider {
  private container: HTMLElement;
  private track: HTMLElement | null = null;
  private handle: HTMLElement | null = null;
  private config: SliderConfig;
  private currentValue: number = 0.5; // 0 = bottom, 1 = top

  constructor(container: HTMLElement, config?: Partial<SliderConfig>) {
    this.container = container;
    this.config = {
      width: 40,
      height: '60%',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      trackColor: 'rgba(0, 255, 255, 0.3)',
      handleColor: 'rgba(0, 255, 255, 0.8)',
      minLabel: '▼',
      maxLabel: '▲',
      ...config
    };

    this.createElements();
  }

  private createElements(): void {
    // Create track
    this.track = document.createElement('div');
    this.track.style.cssText = `
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: ${this.config.width}px;
      height: ${this.config.height};
      background: ${this.config.backgroundColor};
      border: 1px solid ${this.config.trackColor};
      border-radius: 20px;
      pointer-events: none;
    `;

    // Create inner track fill
    const fill = document.createElement('div');
    fill.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 2px;
      right: 2px;
      height: 50%;
      background: linear-gradient(to top, ${this.config.trackColor}, transparent);
      border-radius: 18px;
    `;
    this.track.appendChild(fill);

    // Create handle
    this.handle = document.createElement('div');
    this.handle.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: ${this.config.width - 10}px;
      height: 30px;
      background: ${this.config.handleColor};
      border-radius: 15px;
      box-shadow: 0 0 15px ${this.config.handleColor};
    `;
    this.track.appendChild(this.handle);

    // Create labels
    const maxLabel = document.createElement('div');
    maxLabel.textContent = this.config.maxLabel;
    maxLabel.style.cssText = `
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(0, 255, 255, 0.6);
      font-size: 14px;
    `;
    this.track.appendChild(maxLabel);

    const minLabel = document.createElement('div');
    minLabel.textContent = this.config.minLabel;
    minLabel.style.cssText = `
      position: absolute;
      bottom: -25px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(0, 255, 255, 0.6);
      font-size: 14px;
    `;
    this.track.appendChild(minLabel);

    this.container.appendChild(this.track);
  }

  public setValue(value: number): void {
    this.currentValue = Math.max(0, Math.min(1, value));
    this.updateHandle();
  }

  private updateHandle(): void {
    if (!this.handle || !this.track) return;

    const trackHeight = this.track.offsetHeight;
    const handleOffset = (1 - this.currentValue) * (trackHeight - 30);

    this.handle.style.top = `${handleOffset + 15}px`;
  }

  public getValue(): number {
    return this.currentValue;
  }

  public highlight(active: boolean): void {
    if (!this.track) return;

    if (active) {
      this.track.style.background = 'rgba(0, 255, 255, 0.2)';
      this.track.style.borderColor = 'rgba(0, 255, 255, 0.8)';
    } else {
      this.track.style.background = this.config.backgroundColor;
      this.track.style.borderColor = this.config.trackColor;
    }
  }

  public destroy(): void {
    if (this.track && this.track.parentNode) {
      this.track.parentNode.removeChild(this.track);
    }
  }
}
