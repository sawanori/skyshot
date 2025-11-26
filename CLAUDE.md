# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based 3D 360-degree shooting game (vertical-retro-shooter-web) optimized for mobile portrait mode (9:16 aspect ratio) with PC containerized emulation support.

**Tech Stack:**
- Engine: PlayCanvas (Engine-only or Script-based)
- Language: TypeScript (Strict Mode)
- Bundler: Vite
- Hosting: Vercel
- Visual Style: Retro-Cyber (PS1 Low-poly style + Glitch/Neon Effects)

## Build Commands

```bash
npm run dev      # Start development server
npm run build    # TypeScript compile + Vite build
npm run preview  # Preview production build
```

## Architecture

The project follows a component-manager pattern:

- **Entry Point:** `src/main.ts`
- **Components:** Player, Weapon, Enemy logic (`src/components/`)
- **Managers:** GameManager, InputManager, UIManager (`src/managers/`)
- **UI Systems:** VirtualJoystick, RadarSystem, VerticalSlider (`src/ui/`)
- **Shaders:** Retro grid and glitch post-processing (`src/shaders/`)

### Key Implementation Details

**InputManager** (Singleton):
- Normalizes touch vs mouse input automatically
- Exposes: `moveVector` (Vec2), `lookDelta` (Vec2), `altitudeInput` (number -1 to 1)
- Right edge 15% of screen width is the altitude slider zone

**PlayerController** (extends pc.ScriptType):
- Planar movement using forward/right vectors projected to XZ plane
- Yaw rotation from look input
- Vertical movement with clamped Y position (0-50 units)

**RadarSystem:**
- Displays enemies tagged 'Enemy' on 2D radar
- Uses polar coordinates relative to player (ignoring Y axis)

### Mobile Container Strategy

The game renders in a mobile-sized container (max-width 450px, 9:16 aspect) centered on desktop with neon glow box-shadow. Desktop view includes QR code and controls overlay.
