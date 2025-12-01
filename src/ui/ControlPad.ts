/**
 * ControlPad.ts - Left-side control pad for altitude and yaw
 *
 * A joystick-style control pad on the left side of the screen
 * - Vertical drag: altitude control (up/down)
 * - Horizontal drag: yaw rotation (left/right turn)
 */

export interface ControlPadConfig {
  size: number;
  innerSize: number;
  maxDistance: number;
}

export interface ControlPadState {
  /** Horizontal input (-1 to 1), positive = right/clockwise */
  horizontal: number;
  /** Vertical input (-1 to 1), positive = up */
  vertical: number;
  /** Whether the pad is being touched */
  active: boolean;
}

export class ControlPad {
  private container: HTMLElement | null = null;
  private pad: HTMLElement | null = null;
  private knob: HTMLElement | null = null;
  private config: ControlPadConfig;
  private state: ControlPadState;
  private touchId: number | null = null;
  private centerX: number = 0;
  private centerY: number = 0;

  constructor(config?: Partial<ControlPadConfig>) {
    this.config = {
      size: 100,
      innerSize: 50,
      maxDistance: 35,
      ...config
    };

    this.state = {
      horizontal: 0,
      vertical: 0,
      active: false
    };

    this.createElements();
    this.setupEventListeners();
  }

  private createElements(): void {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'control-pad-container';
    this.container.style.cssText = `
      position: absolute;
      bottom: 100px;
      left: 20px;
      width: ${this.config.size}px;
      height: ${this.config.size}px;
      pointer-events: auto;
      touch-action: none;
      z-index: 60;
    `;

    // Create outer pad (base)
    this.pad = document.createElement('div');
    this.pad.id = 'control-pad';
    this.pad.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(100, 200, 255, 0.3), rgba(50, 100, 150, 0.2));
      border: 3px solid rgba(0, 200, 255, 0.6);
      box-shadow:
        0 0 15px rgba(0, 200, 255, 0.4),
        inset 0 0 20px rgba(100, 200, 255, 0.2);
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    `;

    // Create directional indicators
    const indicators = [
      { symbol: '▲', top: '8px', left: '50%', transform: 'translateX(-50%)' },
      { symbol: '▼', bottom: '8px', left: '50%', transform: 'translateX(-50%)' },
      { symbol: '◀', left: '8px', top: '50%', transform: 'translateY(-50%)' },
      { symbol: '▶', right: '8px', top: '50%', transform: 'translateY(-50%)' }
    ];

    indicators.forEach(ind => {
      const indicator = document.createElement('div');
      indicator.textContent = ind.symbol;
      indicator.style.cssText = `
        position: absolute;
        color: rgba(0, 200, 255, 0.5);
        font-size: 10px;
        pointer-events: none;
        ${ind.top ? `top: ${ind.top};` : ''}
        ${ind.bottom ? `bottom: ${ind.bottom};` : ''}
        ${ind.left ? `left: ${ind.left};` : ''}
        ${ind.right ? `right: ${ind.right};` : ''}
        transform: ${ind.transform};
      `;
      this.pad!.appendChild(indicator);
    });

    // Create inner knob
    this.knob = document.createElement('div');
    this.knob.id = 'control-pad-knob';
    this.knob.style.cssText = `
      width: ${this.config.innerSize}px;
      height: ${this.config.innerSize}px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.9), rgba(0, 150, 200, 0.8));
      border: 2px solid rgba(0, 255, 255, 0.8);
      box-shadow:
        0 0 20px rgba(0, 255, 255, 0.6),
        inset 0 0 15px rgba(255, 255, 255, 0.3);
      position: absolute;
      transition: box-shadow 0.1s;
    `;

    this.pad.appendChild(this.knob);
    this.container.appendChild(this.pad);

    // Create label
    const label = document.createElement('div');
    label.id = 'control-pad-label';
    label.textContent = 'CTRL';
    label.style.cssText = `
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #0cf;
      text-shadow: 0 0 5px #0cf;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
    `;
    this.container.appendChild(label);

    // Add to HUD
    const hud = document.getElementById('hud');
    if (hud) {
      hud.appendChild(this.container);
    }
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.container.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    this.container.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

    // Mouse support for testing on desktop
    this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (this.touchId !== null) return; // Already tracking a touch

    const touch = e.changedTouches[0];
    this.touchId = touch.identifier;
    this.startTracking(touch.clientX, touch.clientY);
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        this.updatePosition(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        this.stopTracking();
        break;
      }
    }
  }

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.startTracking(e.clientX, e.clientY);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.state.active) return;
    this.updatePosition(e.clientX, e.clientY);
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.state.active) {
      this.stopTracking();
    }
  }

  private startTracking(clientX: number, clientY: number): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;

    this.state.active = true;
    this.updateKnobStyle(true);
    this.updatePosition(clientX, clientY);
  }

  private updatePosition(clientX: number, clientY: number): void {
    if (!this.state.active || !this.knob) return;

    let deltaX = clientX - this.centerX;
    let deltaY = clientY - this.centerY;

    // Calculate distance from center
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Clamp to max distance
    if (distance > this.config.maxDistance) {
      const scale = this.config.maxDistance / distance;
      deltaX *= scale;
      deltaY *= scale;
    }

    // Update knob position
    this.knob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Normalize to -1 to 1 range
    this.state.horizontal = deltaX / this.config.maxDistance;
    this.state.vertical = -deltaY / this.config.maxDistance; // Invert Y (up = positive)
  }

  private stopTracking(): void {
    this.touchId = null;
    this.state.active = false;
    this.state.horizontal = 0;
    this.state.vertical = 0;

    // Reset knob position
    if (this.knob) {
      this.knob.style.transform = 'translate(0, 0)';
    }

    this.updateKnobStyle(false);
  }

  private updateKnobStyle(active: boolean): void {
    if (!this.knob || !this.pad) return;

    if (active) {
      this.knob.style.boxShadow = `
        0 0 30px rgba(0, 255, 255, 0.9),
        inset 0 0 20px rgba(255, 255, 255, 0.5)
      `;
      this.pad.style.borderColor = 'rgba(0, 255, 255, 0.9)';
      this.pad.style.boxShadow = `
        0 0 25px rgba(0, 255, 255, 0.6),
        inset 0 0 25px rgba(100, 200, 255, 0.3)
      `;
    } else {
      this.knob.style.boxShadow = `
        0 0 20px rgba(0, 255, 255, 0.6),
        inset 0 0 15px rgba(255, 255, 255, 0.3)
      `;
      this.pad.style.borderColor = 'rgba(0, 200, 255, 0.6)';
      this.pad.style.boxShadow = `
        0 0 15px rgba(0, 200, 255, 0.4),
        inset 0 0 20px rgba(100, 200, 255, 0.2)
      `;
    }
  }

  public getState(): ControlPadState {
    return this.state;
  }

  public getHorizontal(): number {
    return this.state.horizontal;
  }

  public getVertical(): number {
    return this.state.vertical;
  }

  public isActive(): boolean {
    return this.state.active;
  }

  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
