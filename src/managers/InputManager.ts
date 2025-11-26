/**
 * InputManager.ts - Singleton class for unified touch/mouse input handling
 *
 * Normalizes input across devices:
 * - Touch devices: Multi-touch support with zone-based input
 * - Mouse/Desktop: Mouse drag for camera, WASD for movement
 *
 * Input Zones:
 * - Left 40%: Virtual Joystick (movement)
 * - Right 45% (excluding edge): Camera rotation
 * - Right 15% edge: Altitude slider
 */

import * as pc from 'playcanvas';

export interface InputState {
  /** Movement vector (XZ plane), range -1 to 1 */
  moveVector: pc.Vec2;
  /** Camera look delta (accumulated since last frame) */
  lookDelta: pc.Vec2;
  /** Altitude input, range -1 (down) to 1 (up) */
  altitudeInput: number;
  /** Roll input, range -1 (left) to 1 (right) */
  rollInput: number;
  /** Whether any input is active */
  isActive: boolean;
  /** Fire button pressed this frame */
  firePressed: boolean;
  /** Fire button held down */
  fireHeld: boolean;
}

interface TouchInfo {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  zone: 'joystick' | 'camera' | 'altitude';
}

export class InputManager {
  private static instance: InputManager;

  private app: pc.Application | null = null;
  private inputState: InputState;
  private isTouch: boolean = false;

  // Touch tracking
  private activeTouches: Map<number, TouchInfo> = new Map();

  // Mouse tracking
  private isMouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private mouseLookDelta: pc.Vec2 = new pc.Vec2();

  // Keyboard state
  private keys: { [key: string]: boolean } = {};

  // Configuration
  private readonly JOYSTICK_ZONE_WIDTH = 0.4;  // 40% of screen width
  private readonly ALTITUDE_ZONE_WIDTH = 0.15; // 15% of screen width (right edge)
  private readonly LOOK_SENSITIVITY = 0.3;
  private readonly ALTITUDE_SENSITIVITY = 0.005;

  // Fire state
  private fireButtonDown: boolean = false;
  private fireButtonPressedThisFrame: boolean = false;

  private constructor() {
    this.inputState = {
      moveVector: new pc.Vec2(),
      lookDelta: new pc.Vec2(),
      altitudeInput: 0,
      rollInput: 0,
      isActive: false,
      firePressed: false,
      fireHeld: false
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  /**
   * Initialize input manager with PlayCanvas application
   */
  public initialize(app: pc.Application): void {
    this.app = app;

    // Detect input type
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Set up event listeners
    this.setupTouchEvents();
    this.setupMouseEvents();
    this.setupKeyboardEvents();

  }

  /**
   * Set up touch event listeners
   */
  private setupTouchEvents(): void {
    const canvas = this.app?.graphicsDevice.canvas;
    if (!canvas) return;

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
  }

  /**
   * Set up mouse event listeners
   */
  private setupMouseEvents(): void {
    const canvas = this.app?.graphicsDevice.canvas;
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('mouseleave', () => this.onMouseLeave());

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Set up keyboard event listeners
   */
  private setupKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      // Prevent default for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      this.keys[e.code] = true;

      // Fire on F key press
      if (e.code === 'KeyF' && !this.fireButtonDown) {
        this.fireButtonDown = true;
        this.fireButtonPressedThisFrame = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyF') {
        this.fireButtonDown = false;
      }
    });
  }

  /**
   * Determine input zone based on touch/click position
   */
  private getInputZone(x: number, screenWidth: number): 'joystick' | 'camera' | 'altitude' {
    const normalizedX = x / screenWidth;

    if (normalizedX < this.JOYSTICK_ZONE_WIDTH) {
      return 'joystick';
    } else if (normalizedX > (1 - this.ALTITUDE_ZONE_WIDTH)) {
      return 'altitude';
    } else {
      return 'camera';
    }
  }

  /**
   * Handle touch start event
   */
  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();

    const canvas = this.app?.graphicsDevice.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const zone = this.getInputZone(x, rect.width);

      this.activeTouches.set(touch.identifier, {
        id: touch.identifier,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        zone
      });
    }
  }

  /**
   * Handle touch move event
   */
  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();

    const canvas = this.app?.graphicsDevice.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchInfo = this.activeTouches.get(touch.identifier);

      if (touchInfo) {
        touchInfo.currentX = touch.clientX - rect.left;
        touchInfo.currentY = touch.clientY - rect.top;
      }
    }
  }

  /**
   * Handle touch end event
   */
  private onTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.activeTouches.delete(touch.identifier);
    }
  }

  /**
   * Handle mouse down event
   */
  private onMouseDown(event: MouseEvent): void {
    // Left click for firing
    if (event.button === 0) {
      if (!this.fireButtonDown) {
        this.fireButtonPressedThisFrame = true;
      }
      this.fireButtonDown = true;
    }
    // Right click for camera look
    if (event.button === 2) {
      this.isMouseDown = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  /**
   * Handle mouse move event
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isMouseDown) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.mouseLookDelta.x += deltaX;
    this.mouseLookDelta.y += deltaY;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  /**
   * Handle mouse up event
   */
  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.fireButtonDown = false;
    }
    if (event.button === 2) {
      this.isMouseDown = false;
    }
  }

  /**
   * Handle mouse leave event
   */
  private onMouseLeave(): void {
    this.isMouseDown = false;
    this.fireButtonDown = false;
  }

  /**
   * Update input state (called every frame)
   */
  public update(): void {
    // Reset frame-specific values
    this.inputState.lookDelta.set(0, 0);
    this.inputState.altitudeInput = 0;
    this.inputState.rollInput = 0;
    this.inputState.moveVector.set(0, 0);

    // Update fire state
    this.inputState.firePressed = this.fireButtonPressedThisFrame;
    this.inputState.fireHeld = this.fireButtonDown;
    this.fireButtonPressedThisFrame = false; // Reset for next frame

    if (this.isTouch) {
      this.updateTouchInput();
    } else {
      this.updateMouseKeyboardInput();
    }

    this.inputState.isActive =
      this.inputState.moveVector.length() > 0.01 ||
      this.inputState.lookDelta.length() > 0.01 ||
      Math.abs(this.inputState.altitudeInput) > 0.01 ||
      Math.abs(this.inputState.rollInput) > 0.01;
  }

  /**
   * Update input from touch events
   */
  private updateTouchInput(): void {
    const canvas = this.app?.graphicsDevice.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const maxJoystickRadius = Math.min(rect.width, rect.height) * 0.15;

    for (const touchInfo of this.activeTouches.values()) {
      switch (touchInfo.zone) {
        case 'joystick': {
          const deltaX = touchInfo.currentX - touchInfo.startX;
          const deltaY = touchInfo.currentY - touchInfo.startY;

          // Normalize to -1 to 1 range, clamped by max radius
          this.inputState.moveVector.x = Math.max(-1, Math.min(1, deltaX / maxJoystickRadius));
          this.inputState.moveVector.y = Math.max(-1, Math.min(1, -deltaY / maxJoystickRadius)); // Invert Y
          break;
        }

        case 'camera': {
          const deltaX = touchInfo.currentX - touchInfo.startX;
          const deltaY = touchInfo.currentY - touchInfo.startY;

          this.inputState.lookDelta.x = deltaX * this.LOOK_SENSITIVITY;
          this.inputState.lookDelta.y = deltaY * this.LOOK_SENSITIVITY;

          // Update start position for continuous movement
          touchInfo.startX = touchInfo.currentX;
          touchInfo.startY = touchInfo.currentY;
          break;
        }

        case 'altitude': {
          const deltaY = touchInfo.currentY - touchInfo.startY;
          this.inputState.altitudeInput = -deltaY * this.ALTITUDE_SENSITIVITY; // Invert: drag up = go up
          break;
        }
      }
    }
  }

  // Keyboard rotation speed (degrees per frame at 60fps)
  private readonly KEYBOARD_ROTATION_SPEED = 3;

  /**
   * Update input from mouse and keyboard
   */
  private updateMouseKeyboardInput(): void {
    // Keyboard movement (WASD)
    if (this.keys['KeyW']) {
      this.inputState.moveVector.y = 1;
    }
    if (this.keys['KeyS']) {
      this.inputState.moveVector.y = -1;
    }
    if (this.keys['KeyA']) {
      this.inputState.moveVector.x = -1;
    }
    if (this.keys['KeyD']) {
      this.inputState.moveVector.x = 1;
    }

    // Keyboard yaw rotation (Q/E or Arrow Left/Right)
    if (this.keys['KeyQ'] || this.keys['ArrowLeft']) {
      this.inputState.lookDelta.x = -this.KEYBOARD_ROTATION_SPEED;
    }
    if (this.keys['KeyE'] || this.keys['ArrowRight']) {
      this.inputState.lookDelta.x = this.KEYBOARD_ROTATION_SPEED;
    }

    // Keyboard pitch (Arrow Up/Down)
    if (this.keys['ArrowUp']) {
      this.inputState.lookDelta.y = -this.KEYBOARD_ROTATION_SPEED;
    }
    if (this.keys['ArrowDown']) {
      this.inputState.lookDelta.y = this.KEYBOARD_ROTATION_SPEED;
    }

    // Keyboard roll (Z/C) - barrel roll left/right
    if (this.keys['KeyZ']) {
      this.inputState.rollInput = -1;
    }
    if (this.keys['KeyC']) {
      this.inputState.rollInput = 1;
    }

    // Altitude (Space/Shift)
    if (this.keys['Space']) {
      this.inputState.altitudeInput = 1;
    }
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
      this.inputState.altitudeInput = -1;
    }

    // Mouse look (add to keyboard input)
    this.inputState.lookDelta.x += this.mouseLookDelta.x * this.LOOK_SENSITIVITY;
    this.inputState.lookDelta.y += this.mouseLookDelta.y * this.LOOK_SENSITIVITY;

    // Reset mouse delta for next frame
    this.mouseLookDelta.set(0, 0);

    // Normalize diagonal movement
    if (this.inputState.moveVector.length() > 1) {
      this.inputState.moveVector.normalize();
    }
  }

  /**
   * Get current input state
   */
  public getInputState(): InputState {
    return this.inputState;
  }

  /**
   * Get move vector
   */
  public getMoveVector(): pc.Vec2 {
    return this.inputState.moveVector;
  }

  /**
   * Get look delta
   */
  public getLookDelta(): pc.Vec2 {
    return this.inputState.lookDelta;
  }

  /**
   * Get altitude input
   */
  public getAltitudeInput(): number {
    return this.inputState.altitudeInput;
  }

  /**
   * Check if using touch input
   */
  public isTouchDevice(): boolean {
    return this.isTouch;
  }
}
