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
  private readonly ALTITUDE_SENSITIVITY = 0.02; // Increased for better mobile response

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

    // Set up fire button touch events
    this.setupFireButton();

    // Set up touch zones (separate from canvas for better reliability)
    this.setupTouchZones();
  }

  /**
   * Set up dedicated touch zones
   */
  private setupTouchZones(): void {
    this.setupJoystickZone();
    this.setupCameraZone();
    this.setupAltitudeZone();
  }

  /**
   * Set up joystick zone touch events
   */
  private setupJoystickZone(): void {
    const joystickZone = document.getElementById('joystick-zone');
    if (!joystickZone) return;

    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.activeTouches.set(-101, {
          id: -101,
          startX: touch.clientX,
          startY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
          zone: 'joystick'
        });
      }
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        const touchInfo = this.activeTouches.get(-101);
        if (touchInfo) {
          touchInfo.currentX = e.touches[0].clientX;
          touchInfo.currentY = e.touches[0].clientY;
        }
      }
    }, { passive: false });

    joystickZone.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.activeTouches.delete(-101);
    }, { passive: false });

    joystickZone.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.activeTouches.delete(-101);
    }, { passive: false });
  }

  /**
   * Set up camera zone touch events
   */
  private setupCameraZone(): void {
    const cameraZone = document.getElementById('camera-zone');
    if (!cameraZone) return;

    cameraZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.activeTouches.set(-102, {
          id: -102,
          startX: touch.clientX,
          startY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
          zone: 'camera'
        });
      }
    }, { passive: false });

    cameraZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        const touchInfo = this.activeTouches.get(-102);
        if (touchInfo) {
          touchInfo.currentX = e.touches[0].clientX;
          touchInfo.currentY = e.touches[0].clientY;
        }
      }
    }, { passive: false });

    cameraZone.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.activeTouches.delete(-102);
    }, { passive: false });

    cameraZone.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.activeTouches.delete(-102);
    }, { passive: false });
  }

  /**
   * Set up altitude zone touch events
   */
  private setupAltitudeZone(): void {
    const altitudeZone = document.getElementById('altitude-zone');
    if (!altitudeZone) return;

    let startY = 0;

    altitudeZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        startY = e.touches[0].clientY;
        // Register as altitude touch
        this.activeTouches.set(-100, { // Use special ID for altitude zone
          id: -100,
          startX: 0,
          startY: startY,
          currentX: 0,
          currentY: startY,
          zone: 'altitude'
        });
      }
    }, { passive: false });

    altitudeZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        const touchInfo = this.activeTouches.get(-100);
        if (touchInfo) {
          touchInfo.currentY = e.touches[0].clientY;
        }
      }
    }, { passive: false });

    altitudeZone.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.activeTouches.delete(-100);
    }, { passive: false });

    altitudeZone.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.activeTouches.delete(-100);
    }, { passive: false });
  }

  /**
   * Set up fire button touch events
   */
  private setupFireButton(): void {
    const fireButton = document.getElementById('fire-button');
    if (!fireButton) return;

    fireButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.fireButtonDown) {
        this.fireButtonPressedThisFrame = true;
      }
      this.fireButtonDown = true;
      fireButton.classList.add('pressed');
    }, { passive: false });

    fireButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.fireButtonDown = false;
      fireButton.classList.remove('pressed');
    }, { passive: false });

    fireButton.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.fireButtonDown = false;
      fireButton.classList.remove('pressed');
    }, { passive: false });
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
    // Smaller radius for more sensitive joystick control
    const maxJoystickRadius = Math.min(rect.width, rect.height) * 0.08;

    for (const touchInfo of this.activeTouches.values()) {
      switch (touchInfo.zone) {
        case 'joystick': {
          const deltaX = touchInfo.currentX - touchInfo.startX;
          const deltaY = touchInfo.currentY - touchInfo.startY;

          // Normalize to -1 to 1 range, clamped by max radius
          // X controls left/right strafe, Y controls forward/backward boost
          this.inputState.moveVector.x = Math.max(-1, Math.min(1, deltaX / maxJoystickRadius));
          this.inputState.moveVector.y = Math.max(-1, Math.min(1, -deltaY / maxJoystickRadius)); // Invert Y

          // Also add slight yaw rotation based on joystick X (more intuitive for mobile)
          // This makes left/right feel like steering
          this.inputState.lookDelta.x += this.inputState.moveVector.x * 1.5;
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
          // Clamp to -1 to 1 range, with increased sensitivity
          const rawAltitude = -deltaY * this.ALTITUDE_SENSITIVITY;
          this.inputState.altitudeInput = Math.max(-1, Math.min(1, rawAltitude));
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
