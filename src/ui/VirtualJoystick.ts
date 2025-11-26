/**
 * VirtualJoystick.ts - Touch-based virtual joystick UI
 *
 * Features:
 * - Visual joystick overlay
 * - Dynamic positioning on touch
 * - Deadzone support
 *
 * TODO: Implement visual joystick component
 */

export interface JoystickConfig {
  size: number;           // Joystick outer circle size
  handleSize: number;     // Inner handle size
  deadzone: number;       // Minimum input threshold
  color: string;          // Base color
  handleColor: string;    // Handle color
  opacity: number;        // Visual opacity
}

export class VirtualJoystick {
  private container: HTMLElement;
  private outer: HTMLElement | null = null;
  private inner: HTMLElement | null = null;
  private config: JoystickConfig;
  private _isVisible: boolean = false;

  constructor(container: HTMLElement, config?: Partial<JoystickConfig>) {
    this.container = container;
    this.config = {
      size: 120,
      handleSize: 50,
      deadzone: 0.1,
      color: 'rgba(0, 255, 255, 0.3)',
      handleColor: 'rgba(0, 255, 255, 0.8)',
      opacity: 0.7,
      ...config
    };

    this.createElements();
  }

  private createElements(): void {
    // Create outer circle
    this.outer = document.createElement('div');
    this.outer.style.cssText = `
      position: absolute;
      width: ${this.config.size}px;
      height: ${this.config.size}px;
      border-radius: 50%;
      border: 2px solid ${this.config.color};
      background: rgba(0, 0, 0, 0.2);
      pointer-events: none;
      display: none;
      box-shadow: 0 0 10px ${this.config.color};
    `;

    // Create inner handle
    this.inner = document.createElement('div');
    this.inner.style.cssText = `
      position: absolute;
      width: ${this.config.handleSize}px;
      height: ${this.config.handleSize}px;
      border-radius: 50%;
      background: ${this.config.handleColor};
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 15px ${this.config.handleColor};
    `;

    this.outer.appendChild(this.inner);
    this.container.appendChild(this.outer);
  }

  public show(x: number, y: number): void {
    if (!this.outer) return;

    this.outer.style.display = 'block';
    this.outer.style.left = `${x - this.config.size / 2}px`;
    this.outer.style.top = `${y - this.config.size / 2}px`;
    this._isVisible = true;
  }

  public hide(): void {
    if (!this.outer) return;

    this.outer.style.display = 'none';
    this._isVisible = false;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public updateHandle(deltaX: number, deltaY: number): void {
    if (!this.inner) return;

    const maxOffset = (this.config.size - this.config.handleSize) / 2;
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, deltaY));

    this.inner.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
  }

  public resetHandle(): void {
    if (!this.inner) return;
    this.inner.style.transform = 'translate(-50%, -50%)';
  }

  public destroy(): void {
    if (this.outer && this.outer.parentNode) {
      this.outer.parentNode.removeChild(this.outer);
    }
  }
}
