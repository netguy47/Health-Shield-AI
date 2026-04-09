# HealthShield AI — Sovereign Obsidian 

## Context
High-fidelity, zero-knowledge medical SaaS for hemodynamic trajectory analysis. Built as an offline-first PWA with sub-dermal optical sensing capabilities.

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript
- **Design**: Sovereign Obsidian (Bio-Teal `#6ed8c3`, Obsidian Abyss, Glassmorphism)
- **Database**: Firebase Firestore (Node-level AES-256 encrypted)
- **Payment**: Stripe Checkout (Monthly, Yearly, Lifetime)
- **Persistence**: IndexedDB (Offline Buffer)

## Commands
- `npm run dev`: Launch development HUD
- `npm run build`: Compile production-ready instrument
- `git sync`: Sync updates to Sovereign Archive (GitHub)

## Architectural Patterns
- **Zero-Knowledge**: Data is encrypted using `crypto-js` BEFORE entering the stream.
- **Sovereign Interop**: Local heuristic engine (`oracle_engine.ts`) handles clinical logic without cloud reliance.
- **Behavioral Monetization**: Anchoring/Scarcity matrix integrated into the `SAFE` view.

## Critical Invariants
- NEVER log unmasked biometric data to the cloud.
- NEVER bypass clinical disclaimers in the UI.
- ALWAYS verify hemodynamic stages against AHA 2025 guidelines.

## Memory Indices
- `src/lib/oracle_engine.ts`: Clinical sources of truth.
- `src/components/OpticalSensor.tsx`: PPG sensing logic.
- `api/checkout.js`: Secure monetization handler.
