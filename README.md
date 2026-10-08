# Sunset City

A playable, original GTA-inspired browser sandbox built with Three.js. Cruise a procedural coastal city at golden hour, follow checkpoint missions, avoid traffic, and escape the police.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Use `npm run build` for a production build and `npm run preview` to serve it. Niteshift starts the declared web service automatically.

## Play

| Control           | Action                                      |
| ----------------- | ------------------------------------------- |
| WASD / arrow keys | Drive; move on foot                         |
| Space             | Handbrake                                   |
| Shift             | Nitro; sprint on foot                       |
| F                 | Enter or leave your Comet (stop first)      |
| C                 | Cycle chase, wide, and hood cameras         |
| Drag the scene    | Look around                                 |
| M                 | Open city map; click to place a waypoint    |
| H                 | Controls                                    |
| Escape            | Pause / resume                              |
| N                 | Engine audio and original synthesized radio |
| R                 | Recover and repair your car                 |

Mobile layouts include touch steering, throttle, brake, and enter/exit controls. Desktop keyboard and mouse are recommended.

Start **The first getaway** from the mission card and drive through seven green checkpoints. Completing it unlocks **Special delivery**, then **Out of sight**. Rewards and completed mission counts save in localStorage. Missions can be replayed. Crashing into traffic attracts police; get more than 68 meters from every pursuer for 12 seconds to lose them. A wreck costs $250. Recovery is available any time.

The world includes buildings with collisions, pedestrians, 25 traffic cars, parks, street furniture, palm trees, shops, a coastline, and a live minimap. Audio starts only after the player enables it. Graphics settings offer a performance mode without directional shadows.

## Implementation

- `src/world.js`: deterministic city generation, facade textures, batched street geometry, collision boundaries.
- `src/vehicles.js`: procedural cars and pedestrians.
- `src/main.js`: driving, input, missions, traffic, police, camera, audio, persistence, and UI.
- `src/style.css`: responsive HUD and dialogs.

Requires a modern browser with WebGL 2. All scene geometry, textures, and audio are generated locally; no game assets are downloaded. Google Fonts supplies the Barlow typefaces, with system fallbacks. This is a compact single-player sandbox, not a recreation of GTA V's campaign, map, combat, interiors, or multiplayer. Vehicle collisions use simplified geometry and police steering is intentionally arcade-like.

For browser QA, `window.gameState` exposes a read-only snapshot of the current player and mission state. It does not provide mutation or teleport controls.
