# THE UNIVERSE HAS A BUG — 60-Minute Execution Plan

> **Guiding principle:** at any moment during development you can stop, open the website, and show something beautiful, funny, interactive and working. Every stage is a possible **final version**. Later stages make the experience better. They never make it depend on future work.

---

## 0. How to use this plan

**Concept.** A static, client-only Three.js "god simulator". You've been promoted to God by mistake and put in charge of a tiny floating island civilization. You can change the laws of physics (REALITY SETTINGS™), cause absurd disasters (BREAK REALITY) and undo everything (RESTORE REALITY), while the universe comments on your choices.

**Source of features.** The original "The Universe Has a Bug" specification wasn't included in the revision request (the paste contained only a placeholder). The feature list below comes from the previous `PLAN.md`, which was written from that spec. If the spec contains something not listed here, add it to the Parking Lot (§4) and give it a priority.

**Working agreement**
1. One stage per turn. I build the stage, test it in a real browser, commit and push it, report back with the demo summary, tick the boxes and wait for "next". If you say **"auto"**, I keep going stage after stage and still commit and push at every checkpoint.
2. **Standing git authorization (you must confirm).** Approving this plan authorizes me to `git commit` + `git push origin main` at every **STOP HERE** checkpoint and at no other time. Every checkpoint is a rollback point.
3. I start the clock when you approve. I report elapsed time at the end of each stage.

### Time budget & progress tracker

| # | Stage (vertical slice) | Budget | Ends at | Checkpoint | Status |
|---|---|---|---|---|---|
| 0 | Pre-flight: Pages on, local server, scaffolding | 2 min | 0:02 | — | [x] |
| 1 | **A Tiny World Floats.** Diorama island, citizens, intro, click-to-boop, **first deploy** | 14 min | 0:16 | 🟢 **EARLY** | [x] |
| 2 | **Gravity Is a Suggestion.** Physics + REALITY SETTINGS (gravity, bounce) + RESTORE | 9 min | 0:25 | | [x] |
| 3 | **BREAK REALITY: The Duck.** Big red button, FX, audio, one spectacular event | 9 min | 0:34 | 🟡 **MIDDLE** | [x] |
| 4 | **More Ways to Ruin Everything.** Gravity Resigns, Moon, Chicken Apocalypse | 8 min | 0:42 | | [ ] |
| 5 | **Fine-Tuning Creation.** Time, Size, Wind + UNN news ticker | 7 min | 0:49 | 🟠 **LATER** | [ ] |
| 6 | **Polish & Glory.** Achievements, mobile layout, README | 5 min | 0:54 | | [ ] |
| 7 | **Ship It.** Final deploy verification + demo rehearsal (**non-negotiable**) | 6 min | 1:00 | 🔵 **FINAL** | [ ] |

The total is **60 minutes**, and testing and deployment are included in it. Every stage budget already includes its own browser test and commit/push.

---

## 1. Global rules (apply to every stage)

### 1.1 Never break the presentable version
- **Go / No-Go check before starting any stage.** All three must be YES:
  1. The previous stage is committed, pushed and working (console clean, demo works).
  2. Time left ≥ (this stage's **essential** budget) + **6 min reserved for Stage 7**.
  3. No known bug is open in the current version.
  If any answer is NO, don't start the stage. Fix, polish or go straight to Stage 7.
- **Hard clock rules:**
  - **0:20:** Stage 1 must be deployed. If it isn't, everything else stops until it is.
  - **0:45:** If Stage 5 hasn't started, skip to Stage 6 (mobile check only), then Stage 7.
  - **0:54:** Stage 7 starts no matter what. Unfinished work is reverted (`git checkout -- . && git clean -fd js css`) and the last checkpoint ships.
- **3-minute bug rule.** If a bug takes more than 3 minutes to fix, revert to the last checkpoint and cut that feature. Never ship half-integrated work.
- **Essential vs optional.** Each stage lists its **Essential** tasks (needed for the checkpoint) and its **Optional** tasks (do them only if the stage is on schedule). Optional tasks are cut first and in reverse listed order.

### 1.2 Preserve previous work
- Add to the existing modules. Don't rewrite them. Each new feature hooks into the existing `ctx` object and the main loop (see §2.3).
- After every stage, re-run the **full regression smoke test** (§2.6), not just the new feature.
- No stage may rename or restructure files created earlier unless the stage explicitly says so.
- Every UI control that exists must do something real. No decorative or placeholder buttons are ever committed.

### 1.3 Deployment rules
- The project is pure static files: HTML + CSS + ES modules + Three.js from a CDN. **No server, backend, database, build step, npm or API keys.**
- Use relative paths only (`./js/main.js`, never `/js/main.js`), so the site works under `/Agentic-Programming-67723-lab1/`.
- GitHub Pages runs on a case-sensitive filesystem and macOS doesn't. All file names are lowercase, and import paths must match their file names exactly.
- `python3 -m http.server` is used **only** for local testing (ES modules don't load from `file://`). It isn't part of the product.
- "Deployed" means: I fetched the public URL, got HTTP 200, and loaded it in a browser with a clean console. Nothing else counts.

---

## 2. Architecture (fixed up front so no stage has to make big decisions)

### 2.1 Tech choices
- **Three.js r160**, pinned and loaded through an import map from jsDelivr:
  ```html
  <script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  } }
  </script>
  ```
  Addons used: `controls/OrbitControls.js`, `postprocessing/EffectComposer.js`, `RenderPass.js`, `UnrealBloomPass.js`, `OutputPass.js`, `utils/BufferGeometryUtils.js` (`mergeGeometries`).
- **No physics library.** A tiny custom integrator (≈120 lines) gives full control over absurd behavior and has no dependency risk.
- **Audio** is synthesized with the Web Audio API. There are no audio files.
- **Seeded RNG** (`mulberry32(42)`), so the island looks identical on every load. The demo is predictable.

### 2.2 Files (final; the stage that creates each file is in brackets)
```
index.html        [S1] import map, canvas, intro overlay, HUD containers
.nojekyll         [S1] empty, disables Jekyll on Pages
css/style.css     [S1] visual style, glass panels, buttons, toasts, animations
js/main.js        [S1] renderer, composer, camera, controls, loop, intro, ctx wiring
js/util.js        [S1] rng, easing, lerp, clamp, palette constants
js/world.js       [S1] island, houses, town hall, trees, clouds, sky, lights, ambient animation
js/citizens.js    [S1] blob citizens: build + wander/free/getting-up states
js/ui.js          [S1] tooltip, toasts; [S2] settings panel; [S5] ticker; [S6] achievements
js/interact.js    [S1] raycast click → squash + quip
js/sim.js         [S2] bodies, physics params, integrate, impulse, restore
js/fx.js          [S3] particles, shockwave rings, camera shake, screen flash
js/audio.js       [S3] synthesized SFX + mute
js/events.js      [S3] BREAK REALITY event runner + events
```

### 2.3 Shared context and main loop
`main.js` creates one `ctx` object and passes it to every module's `create(ctx)` factory. Each factory returns `{ update(dt, t) }` plus its public API.
```js
ctx = { THREE, scene, camera, controls, renderer, rng,
        params: { gravity: 1, bounce: 0.4, timeScale: 1, wind: 0, scale: {citizen:1, tree:1, house:1} },
        world, citizens, sim, ui, fx, audio, events,
        restoreHooks: [],   // functions called by RESTORE REALITY (S2+)
        stats: { breaks: 0, restores: 0, activeEvents: 0 } }
```
Loop order, every frame:
```
rawDt = min(clock.getDelta(), 1/30)        // clamp: no explosions after tab switch
dt    = rawDt * ctx.params.timeScale       // world time (S5 makes timeScale adjustable)
citizens.update(dt) → sim.update(dt) → events.update(dt) → world.update(dt)
fx.update(rawDt) → ui.update(rawDt) → controls.update()
fx.applyShake(camera) → composer.render() → fx.removeShake(camera)
```
Modules that don't exist yet are skipped (`ctx.sim?.update(dt)`), so every stage runs with whatever exists.

### 2.4 Entity conventions (set in S1 so later stages don't need rewrites)
Every interactive object is a `THREE.Group` with its origin at **ground level** (y = 0 is the island top) and `userData`:
```js
{ kind: 'house'|'tree'|'citizen'|'townhall'|'duck'|..., name: 'House #3',
  quips: ['...', '...'], baseScale: 1, squash: 0 /* timer */, body: null /* set by sim in S2 */ }
```
The final scale is computed in **one place**, `util.applyScale(obj, categoryScale)`: `base × categoryScale × squashFactor`. S1 (squash), S2 (gravity squish) and S5 (size slider) all go through it.

### 2.5 Visual style bible: "golden-hour toy diorama"
- Low-poly, `flatShading: true`, `MeshStandardMaterial` with roughness 0.8 (rubber duck 0.25).
- **Palette** (`util.js`): grass `#7ed957`, grass edge `#5fb83a`, rock `#8b6b4a` / `#6e5440`, walls `#fff3e0`, roofs `#ff6b6b #2ec4b6 #ffd166 #9b5de5 #f15bb5`, water `#4cc9f0`, foliage `#2d9c5a #43aa8b #90be6d`, window glow `#ffe8a3`, sky top `#1a1446`, sky mid `#6a4c93`, horizon `#ffb4a2`, sun `#ffd6a5`, UI accent teal `#2ec4b6`, danger red `#ff3b3b`.
- Typography: Google Fonts **"Fredoka"** (headings and buttons) + system UI for body text. One `<link>`, fallback `system-ui`.
- UI panels: glass style (`backdrop-filter: blur(14px)`, `rgba(20,16,50,.55)`, 1px `rgba(255,255,255,.15)` border, radius 18px, soft shadow).

### 2.6 Testing protocol (every stage, ~1.5 min)
1. Local server running in the background: `python3 -m http.server 8000` (started in Stage 0).
2. Open `http://localhost:8000/` in Chrome (claude-in-chrome skill). Take a screenshot and **read the console**. Zero errors and zero 404s are required.
3. Run the **regression smoke test**: every feature from earlier stages, in the order of their demo scripts.
4. Narrow viewport (≈390 px wide): nothing important is off-screen and there's no horizontal scroll.
5. Commit + push. Then fetch the Pages URL and check the new module files return 200.

---

## 3. Stages

---

### Stage 0 — Pre-flight (2 min)

**Objective.** Remove deployment risk before writing any code. Pages can be enabled now, because `main` already has an `index.html`.

**Tasks**
- [ ] 0.1 **You:** GitHub → repo `Agentic-Programming-67723-lab1` → Settings → Pages → *Deploy from a branch* → `main` / `(root)` → Save. (The `gh` CLI isn't installed, so this one click is yours.)
- [x] 0.2 **Me:** start `python3 -m http.server 8000` in the background, then fetch `https://helenandmir.github.io/Agentic-Programming-67723-lab1/` to confirm the current placeholder page is live (200).
- [x] 0.3 **Me:** create empty `js/` and `css/` folders and `.nojekyll`.

**Done when:** the public URL returns 200 with the old placeholder page and the local server responds.
**If Pages isn't ready:** keep going. Stage 1's push will trigger the deploy, and I check the URL again then.

---

### Stage 1 — A Tiny World Floats (14 min) → 🟢 EARLY CHECKPOINT

#### A. Objective
Deliver the **visual wow first**: a polished, living miniature universe with a funny intro and one delightful interaction, **deployed to the public URL**. Everything later builds on this scene, and if we stop here, this is already a charming demo.

#### B. Implementation tasks
**Essential**
- [x] 1.1 `index.html`: replace the placeholder. It contains the import map (§2.1), the Fredoka font link, `<canvas id="scene">`, `#intro` overlay, `#tooltip`, `#toasts`, `#hud` containers and `<script type="module" src="./js/main.js">`. Title: *The Universe Has a Bug*. Inline SVG emoji favicon 🌍.
- [x] 1.2 `css/style.css`: full-viewport canvas (`position:fixed; inset:0`), dark `body` background `#1a1446` (no white flash while loading), glass-panel class, button styles, `#intro` styles, tooltip bubble, toast stack, keyframes (`fadeIn`, `popIn`, `float`).
- [x] 1.3 `js/util.js`: `mulberry32`, `rand(a,b)`, `pick(arr)`, `lerp`, `clamp`, `easeOutCubic`, `easeOutBack`, `PALETTE`, `ISLAND_R = 10`, `applyScale(obj, k)`.
- [x] 1.4 `js/main.js`:
  - `WebGLRenderer({ antialias: true })`, pixelRatio `min(devicePixelRatio, 2)`, `ACESFilmicToneMapping`, exposure 1.0, `shadowMap.enabled = true` with `PCFSoftShadowMap`.
  - `EffectComposer` on a `WebGLRenderTarget(w, h, { samples: 4, type: HalfFloatType })` (keeps MSAA). Passes: `RenderPass` → `UnrealBloomPass(res/2, strength 0.55, radius 0.5, threshold 0.85)` → `OutputPass`.
  - `PerspectiveCamera(45)` at `(18, 12, 18)` looking at `(0, 0.5, 0)`, the classic ¾ diorama angle.
  - `OrbitControls`: `enableDamping` (0.06), `enablePan = false`, `minDistance 10`, `maxDistance 45`, `maxPolarAngle = 0.78π` (you can look under the island at its rocky roots), `autoRotate = true`, `autoRotateSpeed 0.35`. Auto-rotate pauses on `start` and resumes 8 s after `end`.
  - Resize handler (renderer, composer, bloom, camera aspect). The loop follows §2.3.
  - WebGL failure fallback: wrap renderer creation in try/catch and show a friendly message instead of a blank page.
- [x] 1.5 `js/world.js`, **the island** (all built from primitives with the seeded RNG):
  - **Grass top:** `CylinderGeometry(10, 9.6, 0.8, 48)`, top at y = 0, grass color. A thin darker ring of slightly larger radius at the edge gives a "cake layer" outline.
  - **Rocky underside:** an inverted `ConeGeometry(9.6, 9, 14, 4)` below the top, with vertices jittered (±0.4) for crags. Add 4 smaller inverted cones (stalactites, length 2–4) hanging off its sides. Two rock tones.
  - **Floating debris:** 8 small `DodecahedronGeometry` rocks orbiting at radius 11–14, y −3 to −8, each bobbing on its own phase.
  - **Town hall** at the center: 2×1.6×2 cream box, roof, a **clock tower** (box + pyramid roof) and an emissive clock face whose two hands show **real wall-clock time**.
  - **9 houses** on a ring of radius ≈5.5 (angle jitter ±10°), all facing the center. Each house is a cream box (random 1–1.3 wide), a 4-sided cone roof rotated 45° in a random roof color, a darker door, 2 windows with `emissive #ffe8a3`, intensity 1.6 (these glow with bloom) and a chimney.
  - **22 trees**, rejection-sampled at radius 2.5–9.2 and at least 1.3 apart from houses and other trees. Brown cylinder trunk plus 2–3 stacked icosahedron or cone foliage pieces in random foliage greens. Each tree sways: an inner `sway` child group holds the trunk and foliage, and only that child gets `rotation.z = sin(t·1.3 + phase)·0.03`. The outer group stays free for physics.
  - **Flowers / rocks:** 60 tiny flowers (an InstancedMesh of small spheres in pink/yellow/white) plus 6 small grey rocks.
  - **Sky:** `SphereGeometry(200)` with a `BackSide` `ShaderMaterial` gradient (top → mid → horizon, mixed by normalized y). Uniforms are exposed so S4 can darken it. `Points` starfield (1500 stars, radius 150, upper hemisphere weighted). `scene.fog = Fog(horizon, 60, 170)`.
  - **Lights:** `HemisphereLight(#bde0fe, #6a4c93, 0.7)`. Sun `DirectionalLight(#ffd6a5, 2.4)` at `(12, 18, 8)` with `castShadow`, mapSize 2048, shadow-camera bounds ±14, bias −0.0005. A purple rim `DirectionalLight(#9b5de5, 0.6)` from behind, without shadows. Houses, trees and citizens cast and receive shadows; the grass top receives them.
  - **Clouds:** 6 clusters of 4–6 white flat-shaded spheres, slowly orbiting the island at y 6–9 and radius 12–18.
  - `world.update(dt, t)`: tree sway, cloud drift, debris orbit, clock hands, and a gentle bob of `world.root` (y ± 0.15, period 6 s).
  - **Scene graph:** the island, all entities, the debris and (from S3) the fx objects are children of one `world.root` Group, so everything bobs together. The sim works in `world.root` local coordinates. The sky, stars and clouds stay in `scene`.
- [x] 1.6 `js/citizens.js`: **25 blob citizens.** Each one is a sphere scaled (0.35, 0.45, 0.35) in a random palette color, with 2 white eye spheres and black pupils facing forward, plus a hat on 50% of them (cone or flat cylinder).
  - Behavior: **wander.** Pick a random target within radius 8.5, walk at 0.8–1.4 u/s, face the direction of travel, hop bob (`y = |sin(t·10)|·0.08`), idle 1–3 s at the target, repeat.
  - States are `wander | free | gettingUp` (S2 uses free and gettingUp). In S1 only `wander` and `idle` are active.
- [x] 1.7 `js/ui.js`: `tooltip(text, worldPos)` (DOM bubble projected to screen with `Vector3.project`, follows the object while visible, disappears after 2.5 s) and `toast(text, kind)` (stack in the bottom-left, slides in, auto-removes after 4 s, max 3 visible).
- [x] 1.8 `js/interact.js`: a `Raycaster` on `pointerup`, **only if the pointer moved < 6 px since `pointerdown`** (so orbit-drags don't count as clicks). Walk up the parents to the first object with `userData.kind`.
  - The clicked object gets a squash animation: `squashFactor = 1 + sin(τ·22)·e^(−6τ)·0.35` on y, with the inverse sqrt on x/z, for 0.6 s.
  - Then a tooltip with a random quip (not the same one twice in a row). A clicked citizen also does a little jump and says something.
  - Quips (≥4 per kind). For example:
    - House: "Mortgage: 400 years." / "Please knock. Not like that."
    - Tree #17: "I photosynthesize, therefore I am."
    - Town Hall: "Open Mon–Fri, 9:00–9:05." / "Bolted down by bureaucracy."
    - Citizen: "Hello, God! Big fan." / "Are you… the admin?"
  - Desktop hover changes the cursor to `pointer` over clickable objects (raycast throttled to every 3rd frame).
- [x] 1.9 **Intro overlay** (in `main.js` + CSS). The scene renders **behind** a blurred, dimmed overlay showing:
  - **THE UNIVERSE HAS A BUG** (large Fredoka, subtle glitch text-shadow animation)
  - "You have been promoted to God." / "There was an administrative error."
  - A button: **[ ACCEPT QUESTIONABLE RESPONSIBILITY ]**

  Clicking it fades the overlay out (0.6 s) and flies the camera in from `(42, 30, 42)` to the default position over 2.5 s (`easeOutCubic`). Controls stay disabled until the fly-in ends. In S3 this click also unlocks audio.
- [x] 1.10 HUD: a small top-left label: **"Universe v0.0.1-beta"** plus *"Population: 25 (unaware)"*. The population number is real: it counts citizens.
- [x] 1.11 Test (§2.6), then `git commit` + `git push`, then verify the public URL (**first deploy**).

**Optional (cut if behind, from the bottom up)**
- [x] 1.12 Pond + **waterfall** pouring off the island edge into the void. A plane 1.4 wide × 12 tall with a scrolling-stripe `ShaderMaterial` (`fract(vUv.y*6 + t*2)`), alpha fading to 0 at the bottom, slightly emissive so it glows.
- [ ] 1.13 Chimney smoke: 3 grey spheres per chimney rising, growing and fading on a loop.
- [ ] 1.14 Two birds (V-shaped flapping planes) circling above the island.

#### C. Visual requirements
- The first frame (behind the intro) is a **floating island at golden hour**: warm sun, purple-to-peach gradient sky, stars fading in at the top, soft shadows, glowing windows with bloom halos, clouds drifting at eye level, debris rocks orbiting below.
- The underside is dramatic: craggy two-tone rock cone, stalactites, and the island visibly bobs.
- Citizens hop around the town. The clock tower shows the real time.
- The UI is minimal and stylish: a glass intro card, a small HUD label, bubble tooltips. There are no default browser buttons.

#### D. Functional requirements
- Intro button → overlay fades, camera fly-in, controls enabled.
- Drag to orbit, scroll or pinch to zoom, smooth damping. Auto-orbit resumes after 8 s idle.
- Clicking any house, tree, citizen or the town hall → squash animation + quip tooltip.
- Window resize keeps the right aspect ratio, with no stretching.
- Works with touch (tap = click).

#### E. Technical guidance
- Share geometries and materials: one `MeshStandardMaterial` per palette color, kept in a `mats` cache in `world.js`.
- Build each house/tree/citizen with a factory function (`makeHouse(rng, color)`) that returns a `Group` following §2.4. S2 just loops over `world.entities`.
- `world.entities` is a flat array of all interactive groups. `citizens.list` holds the citizens and is also appended to `world.entities`.
- Don't use InstancedMesh for houses, trees or citizens: they need to become independent physics bodies in S2. Flowers can use it, since they're decor.
- Keep draw calls reasonable: about 25 citizens × 5 meshes + 9 houses × 7 + 22 trees × 4 ≈ 280 meshes. That's fine at 60 fps on a laptop.

#### F. Definition of done
- [ ] Page loads locally with **zero console errors or warnings that matter** (no 404s).
- [ ] The scene matches the visual requirements, checked with a screenshot.
- [ ] Intro → fly-in → orbit → click-boop all work, by mouse and at a narrow viewport.
- [ ] ≈60 fps on a laptop (no visible stutter while orbiting).
- [ ] Committed, pushed, and **the public URL loads the new island** (HTTP 200, and the same visuals in the browser).

#### G. 🟢 STOP HERE — PRESENTABLE VERSION
**Demo (60 s):** open the public URL and read the intro aloud ("…there was an administrative error"). Click **ACCEPT QUESTIONABLE RESPONSIBILITY** and enjoy the cinematic fly-in. Orbit around and under the island to show the rocky roots and floating debris. Point out the clock tower showing the real time. Click a house ("Mortgage: 400 years"), the town hall ("Bolted down by bureaucracy") and a citizen (it jumps: "Are you… the admin?"). Let go, and the camera drifts into an auto-orbit showcase.

#### H. Estimated time: **14 min** (code ~8, test/fix ~3, deploy + verify ~3)

---

### Stage 2 — Gravity Is a Suggestion (9 min)

#### A. Objective
The first **reality-bending vertical slice**: one beautiful, fully working physics interaction. Drag a gravity slider and watch the town lift off and hover, then come crashing back with bounces. **RESTORE REALITY** comes in the same stage so the demo can always be reset. It goes here because it's the core fantasy ("you control physics") and the foundation every event reuses.

#### B. Implementation tasks
**Essential**
- [x] 2.1 `js/sim.js` creates a body for every entity in `world.entities` (citizens, houses, trees; the town hall is **anchored**, as the joke goes: "bolted down by bureaucracy"):
  ```js
  body = { obj, kind, home: {pos, quat}, vel: V3, angVel: V3, radius,
           state: 'home'|'free'|'returning', liftThreshold, hoverCeil, ret: {t, delay, fromPos, fromQuat} }
  ```
  - `liftThreshold` depends on the category, plus `rand(0, 0.15)`: citizen 0.85, tree 0.55, house 0.3. When `params.gravity < liftThreshold`, the body detaches. Dragging the slider down makes the town lift off **gradually**: citizens first, then trees, then houses. This is the money shot.
  - `hoverCeil = rand(4, 14)`.
- [x] 2.2 Integration for `state === 'free'`, every frame:
  - `vel.y += -9.8·gravity·dt`.
  - Above `hoverCeil`, apply a soft restoring force `-(y - hoverCeil)·3`, so with negative gravity objects **hover and bob at different heights** instead of flying away.
  - With `gravity < 0.3`, air drag `vel *= 0.985`.
  - Position += vel·dt. Rotation integrates `angVel`; detaching gives a random `angVel` (±1.5) for a slow tumble.
  - **Ground contact** (`y < 0` and `xz radius < ISLAND_R`): set `y = 0`, `vel.y = -vel.y·bounce`, xz friction `vel.xz *= 0.85`, `angVel *= 0.7`, and trigger a squash of size ∝ impact speed. If `|vel.y| < 0.5` and `gravity ≥ 0.9`, the body settles and stays where it landed (a messy town is funny). Citizens switch to `gettingUp`: they slerp upright over 0.5 s, then wander again.
  - **Off the edge** (`xz > ISLAND_R`): no ground, so it falls into the void. Below y = −40 it respawns at `home` with a pop-in scale and the toast *"Citizen #12 has been recycled."*
  - Speed is clamped to 40. Bounce > 1 adds energy, and that's intended.
- [x] 2.3 With `gravity > 1.2`, citizens and houses get a static "heavy" squish (scaleY = 1 − 0.12·(g−1)) through `applyScale`.
- [x] 2.4 `sim.impulse(center, radius, strength)`: detaches bodies in range and adds `dir·strength·falloff + up·strength·1.2·falloff`. It's **built now** for S3 and also used by RESTORE testing.
- [x] 2.5 `sim.restore()`:
  - Every non-home body becomes `returning`, with delay = `distance(home, 0)/ISLAND_R · 0.4 s`, so restore sweeps outward like a wave.
  - Over 1.0 s: position `lerp` with `easeOutBack`, quaternion `slerp` to `home.quat`.
  - Gravity animates back to 1 and bounce back to 0.4. **The sliders visibly glide back.**
  - Calls every function in `ctx.restoreHooks`.
  - `ctx.stats.restores++`.
- [x] 2.6 Restore visual: an expanding teal ring (`RingGeometry(0.92, 1, 96)`, flat, `MeshBasicMaterial` with additive blending, transparent). Scale goes 0.5 → 16 and opacity 1 → 0 over 1.2 s, starting at the island center. A toast: *"Reality restored. Nobody saw anything."*
- [x] 2.7 `ui.js` **REALITY SETTINGS™ panel**: a glass card on the right (300 px), with header "REALITY SETTINGS™" and the tiny subtitle *"Warranty void if adjusted"*. It's collapsible with a chevron.
  - **Gravity** slider: −1 … 3, step 0.05. Its live label names the zone: −1 "Upside-down", 0 "Space Mode", 1 "Earth (boring)", 2 "Heavy Day", 3 "Jupiter-ish".
  - **Bounciness** slider: 0 … 1.3. Zones: "Clay", "Normal", "Rubber", "Flubber (illegal)".
  - Custom-styled range inputs with a teal track fill and a big round thumb.
  - **RESTORE REALITY** button: wide, teal gradient, sparkle emoji ✨, glows on hover.
  - `ui.setParam(name, value, {animate})` sets the param **and** moves the slider. Events and restore use it too.
- [x] 2.8 Commentary: when the gravity slider settles (600 ms debounce) **in a new zone**, toast a random line from that zone's bank (≥3 lines each). For example:
  - g < −0.3: "Gravity is now optional. Citizens have filed a complaint."
  - ≈0: "Welcome to space. Please hold onto your houses."
  - 0.3–0.9: "Citizens report feeling 'floaty'. Productivity down 80%."
  - ≈1: "Gravity restored to factory settings. Boring, but legal."
  - 1.2–2: "Everyone suddenly gained 40 kg."
  - > 2: "Jupiter mode. Spines are being compressed."

  Bounciness > 1 gets: "Flubber levels exceed legal limits."
- [x] 2.9 Test with the full regression (S1 demo + new features), then commit + push + verify the URL.

**Optional**
- [x] 2.10 HUD **Reality Stability** meter. A real value: `100 − 15·|g−1| − 5·(free bodies / total)·10`, clamped, with color shifting green → amber → red. It goes to 100% on restore.
- [ ] 2.11 Floating citizens show "!" speech-bubble sprites while free.

#### C. Visual requirements
- The panel appears after the intro, sliding in from the right.
- Dragging gravity down makes citizens pop up first, then trees uproot, then houses lift off, all tumbling slowly and hovering at different heights under the clouds. Glowing windows are now floating in the sky.
- Gravity back to 1 → everything rains down, bounces (higher with Flubber) and lands scattered and crooked. Citizens get back up and wander around the mess.
- High gravity → everyone visibly squishes.
- RESTORE → a teal ring sweeps across the island and everything flies home in a wave from the center outward, with an overshoot-and-settle. The sliders glide back.

#### D. Functional requirements
- The gravity and bounciness sliders affect the simulation in real time.
- RESTORE always returns every body home, from any state, including mid-flight and even if it's spammed.
- Bodies that fall off the island respawn. The island never permanently empties.
- All S1 features still work: clicking a floating house still squashes it and shows a quip.

#### E. Technical guidance
- Bodies manipulate `obj.position` and `obj.quaternion` directly, in `world.root` local space. `world.update` must not overwrite the transforms of non-home bodies. It only animates the tree-sway child mesh, never the tree group itself. Raycast impact points are converted with `world.root.worldToLocal()` before calling `sim.impulse`.
- Citizens: `citizens.update` only runs the wander AI when `body.state === 'home'`. When a citizen settles after being free, its new position becomes its wander anchor. Its `home` (the restore target) stays the original.
- Keep everything O(n). There is no body-to-body collision (that's Parking Lot): ~60 bodies is trivial.
- Respect `prefers-reduced-motion` for UI animations only (not the sim).

#### F. Definition of done
- [ ] Gravity −1 → 0 → 1 → 3 each produce the described visuals. Restore works from every one of them.
- [ ] Spamming RESTORE 5× and dragging sliders while things return causes no errors and no stuck bodies.
- [ ] Regression: intro, fly-in, orbit, click quips all OK. Console clean.
- [ ] Committed + pushed + public URL shows the panel.

#### G. STOP HERE — PRESENTABLE VERSION
**Demo (90 s):** Stage 1 demo, then *"…but I'm God, so let's adjust a few things."* Slowly drag **Gravity** toward −1. Citizens float first, then trees, then whole houses with glowing windows drift up past the clouds. ("Gravity is now optional. Citizens have filed a complaint.") Set **Bounciness** to *Flubber (illegal)*, then snap gravity to 3. Everything slams down and bounces absurdly, and citizens get up and wander through the wreckage. Click **RESTORE REALITY**: the magic ring sweeps out, the town reassembles itself, and the sliders glide back. *"Reality restored. Nobody saw anything."*

#### H. Estimated time: **9 min** (code ~5, test/fix ~2.5, deploy ~1.5)

---

### Stage 3 — BREAK REALITY: The Duck (9 min) → 🟡 MIDDLE CHECKPOINT

#### A. Objective
Add the signature feature: the **giant red BREAK REALITY button**, with **one spectacular, fully polished disaster**: *Unscheduled Duck*. A colossal rubber duck falls from the sky. Its shadow grows first. It lands with a shockwave, particles, camera shake and a QUACK, and launches the whole town. This stage also builds the reusable FX, audio and event-runner foundation, but only as much of it as the duck needs.

#### B. Implementation tasks
**Essential**
- [x] 3.1 `js/fx.js`:
  - **Particle pool:** one `Points` object with 800 slots. Buffer attributes `position`, `color`, `size`. CPU arrays `vel`, `life`, `maxLife`, `gravity`.
  - Custom `ShaderMaterial`: size attenuation, a soft round sprite in the fragment shader (`smoothstep` on `gl_PointCoord`), additive blending, `depthWrite: false`.
  - `fx.emit(pos, count, {color(s), speed, spread, up, life, gravity, size})`. Dead particles are moved off-screen. When the pool is full, the oldest particles are recycled.
  - **Shockwave:** a pool of 4 flat ring meshes. `fx.shockwave(pos, color, maxScale, dur)`.
  - **Camera shake:** `fx.shake(amplitude, duration)` with decay. The offset is added after `controls.update()` and removed after render, so OrbitControls never accumulates drift.
  - **Screen flash:** `fx.flash(color, ms)`, a full-screen div.
- [x] 3.2 `js/audio.js`: an `AudioContext` created on the intro button click (the user gesture), with a master `GainNode` at 0.5.
  - `quack()`: sawtooth 420→260 Hz over 0.18 s through a bandpass at 1.2 kHz, with an 18 Hz vibrato LFO, played twice.
  - `boom()`: a noise buffer through a lowpass sweep 800→60 Hz, plus a sine 110→40 Hz, 0.8 s.
  - `boing()`: sine 180→520 Hz with vibrato, 0.4 s.
  - `whoosh()`: filtered noise sweep.
  - `chime()`: 3 sine notes in arpeggio.
  - A **🔊 / 🔇 mute toggle** at the top right. It works: master gain 0 ↔ 0.5. The state is remembered in `localStorage`, wrapped in try/catch.
  - Every function no-ops safely if there's no context yet.
  - RESTORE now plays `chime()` and emits teal sparkles along the ring.
- [x] 3.3 `js/events.js`, the runner:
  ```js
  event = { id, name, headline, duration, start(ctx, ev), update(dt, ctx, ev), end(ctx, ev), cleanup(ctx, ev) }
  ```
  - `events.trigger()` picks a random event that isn't the same as the last one (with only one event, it's always the duck).
  - Up to **2 events** can run at once. A third press → toast *"The universe is buffering. Please wait."* plus a button wobble.
  - `ctx.stats.breaks++`.
  - A `restoreHooks` entry ends and cleans up all active events immediately.
  - Event objects are **built once lazily and reused** (hidden/shown), so there are no leaks from spamming.
- [x] 3.4 **BREAK REALITY button**: bottom-center, a 120 px circle. Red radial gradient, a glossy highlight, a thick dark-red bottom "3D" edge shadow, a pulsing red glow (CSS keyframes), the label "BREAK REALITY" in Fredoka with a ⚠ above it. Pressing it squashes the button (`translateY(6px)`, shadow shrinks). The whole thing sits in a little hazard-striped base plate.
- [x] 3.5 **Event banner**: on start, a top-center banner slams in (scale 1.4 → 1 with a slight rotation): "⚠ REALITY EVENT: UNSCHEDULED DUCK", with the subtitle *"Duck classified as weather event"*. It slides away after 3.5 s.
- [x] 3.6 **Unscheduled Duck** (built from primitives, ~5 units tall when scaled):
  - Body: an ellipsoid sphere. Head: a sphere. Beak: a flattened, rotated orange cone. Eyes: black spheres with white highlight dots. Tail: a small cone. The material is glossy yellow `#ffd60a`, roughness 0.25, with a slight emissive so it pops.
  - **Anticipation (0–1.4 s):** the duck spawns at y = 45 above a random point within radius 3. A dark shadow disc grows on the grass (`CircleGeometry`, opacity 0 → 0.55, scale 0.5 → 4). Citizens near it switch to a "flee" mode, running away from the shadow at 2.5 u/s with "!" bubbles if 2.11 exists. Plays `whoosh()`.
  - **Impact:** the duck squashes (y 0.55 → spring back with `easeOutBack`). `fx.shockwave` in yellow, scale 18. `fx.emit` 200 particles (yellow, white and orange "feathers", upward cone). `fx.shake(0.6, 0.8)`, `fx.flash('#fff', 120)`, `audio.boom()` then `audio.quack()`. `sim.impulse(impactPos, 9, 14)` sends citizens, trees and houses flying.
  - **Bounce:** the duck itself bounces 2–3 times using `params.bounce`, so Flubber gives a huge duck bounce (a nice synergy with S2). Each landing makes a smaller shockwave and plays `boing()`.
  - **Idle (until 14 s):** the duck sits there, squeaks every 3 s with a mini squash and a quack, and slowly turns its head toward the camera.
  - **Exit:** it floats up while spinning like a balloon, with the toast *"The duck has left the chat."* Restore → instant pop-shrink exit.
- [x] 3.7 Test: trigger the duck 5×, combined with gravity changes and restore mid-event. Regression test. Commit + push + verify.

**Optional**
- [x] 3.8 A clicked duck squeaks and says "I am not a metaphor."
- [ ] 3.9 The camera automatically eases its distance out by 15% during impact (dramatic framing), then hands control back.

#### C. Visual requirements
- A big, glossy, physical-looking red button that you **want** to press.
- Duck sequence: a growing shadow, panicking citizens, a massive yellow duck slamming down, a white flash, a yellow shockwave ring racing outward, a feather burst with bloom, the screen shaking, houses, trees and citizens cartwheeling through the air, the duck bouncing, then sitting there smugly squeaking.
- A banner with a funny headline. The toast stack keeps commenting.

#### D. Functional requirements
- The button triggers the duck. Spamming it is capped gracefully.
- RESTORE at any point removes the duck and reassembles the town.
- The mute toggle actually mutes. Audio never throws even if blocked.
- All S1 and S2 features keep working, including gravity and bounce changes during the event.

#### E. Technical guidance
- Particle CPU update loop: about 800 iterations per frame is negligible. Only upload `position` (and `color` when emitting) with `needsUpdate`.
- Build the duck in `events.js` as `makeDuck()`. Register it in `world.entities` so S1's click handler works on it, but **not** as a sim body: the duck is driven by its own simple vertical integrator.
- Citizen flee: `citizens.fleeFrom(point, radius, seconds)` sets a temporary target directly away from the point.
- Keep the runner generic. S4 events are added as new objects in the `EVENTS` array and nothing else changes.

#### F. Definition of done
- [ ] The duck event plays fully, looks spectacular and is repeatable 5× with no errors, leaks or orphaned meshes. (Check the `scene.children` count is stable after restore.)
- [ ] Sound works after the intro click, and mute works.
- [ ] Restore mid-event works. Gravity sliders work mid-event.
- [ ] Regression OK. Console clean. Committed + pushed + public URL verified.

#### G. 🟡 STOP HERE — PRESENTABLE VERSION
**Demo (2 min):** S1 + S2 demo, then *"Of course, as God, I also have this button."* Press **BREAK REALITY**: the "⚠ UNSCHEDULED DUCK" banner appears, a shadow grows, and citizens flee screaming. **QUACK-BOOM**: a giant rubber duck flattens the town square, the shockwave launches everyone, and the camera shakes. Set Bounciness to Flubber and press again: the duck now bounces like a basketball. Click the duck. Hit **RESTORE REALITY**: the duck pops away, the town rebuilds and a chime plays. This is a complete, funny, spectacular product.

#### H. Estimated time: **9 min** (code ~5.5, test/fix ~2, deploy ~1.5)

---

### Stage 4 — More Ways to Ruin Everything (8 min)

#### A. Objective
Variety. With 3 more distinct events, BREAK REALITY becomes a surprise box, so repeated presses stay entertaining. Each event mostly reuses existing systems (sim, fx, audio, ui.setParam). They're ordered from **cheapest and highest-certainty** to **most ambitious**, and **each one is committed separately**, so the stage can stop after any event.

#### B. Implementation tasks (each event = add an entry to `EVENTS`; then test + commit)
**Essential**
- [ ] 4.1 **Gravity Has Resigned** (≈2 min, 7 s event):
  - Start: remember the current gravity, then `ui.setParam('gravity', -0.6, {animate: true})`. **The slider visibly slides by itself** and the town lifts off through the S2 sim.
  - A **resignation letter** card (cream parchment, rotated −2°, serif/typewriter font, drop shadow) pops up in the center-left:
    > *"To whom it may concern: I have been holding everything down for 13.8 billion years without a single thank-you. Effective immediately, I quit. — Gravity"*

    It has a working **[Accept Resignation]** button that closes the letter early.
  - Plays `whoosh()`.
  - End: gravity animates back to the remembered value. Toast: *"Gravity has been rehired. At minimum wage."*
- [ ] 4.2 **The Moon Is Too Close** (≈3.5 min, 10 s event):
  - The moon is a `SphereGeometry(6, 32, 24)` in grey `#cfd2e0` with ~12 darker crater spheres partially embedded, and a cute face (2 black eye spheres + a small partial-torus smile). An emissive 0.15 makes it glow faintly, so bloom kisses its edge.
  - 0–4 s: it approaches from `(0, 30, −120)` to `(0, 12, −20)` (`easeInOutCubic`). The sky uniforms lerp to a night palette, sun intensity drops 2.4 → 0.7, and the hemisphere light turns blue. Shake ramps 0 → 0.2, with a rumble (low noise) that grows.
  - 4 s, the **BOOP**: the moon lunges to `(0, 9, −13)` and back. `sim.impulse(origin, 30, 6)` launches everything upward, and `ctx.sim.lowG = 3` multiplies g by 0.15 for 3 s, so everything floats in moonlight. Particles, shockwave, boom.
  - 5–10 s: its face switches to "oops" (eyes squint, the mouth flips to an O) and a tooltip-bubble on it says "sorry". It retreats sheepishly, and the sky and lighting lerp back.
- [ ] 4.3 **Chicken Apocalypse** (≈2.5 min, 18 s event):
  - Build one chicken from primitives: a white body sphere, head, red comb, orange beak and black eyes, colored with **vertex colors**. Merge them with `mergeGeometries` into one geometry and use **one `InstancedMesh(60)`**.
  - Spawn 60 chickens over 3 s at y 25–40, at random xz within the island radius.
  - A lightweight array-based integrator (same rules as sim: gravity param, bounce param, island ground, off-edge fall) updates the instance matrices. After landing, each chicken hops randomly (`vel.y = 2–4` every 0.5–1.5 s) and turns.
  - Throttled `cluck()` (short square-wave chirps 900→600 Hz, max 6/s). Small white feather particles on each landing.
  - Banner: "⚠ CHICKEN APOCALYPSE", subtitle *"Forecast: 100% chance of poultry."*
  - End: the chickens shrink away. Restore: they vanish instantly.

**Optional (in this order)**
- [ ] 4.4 **UNIVERSE.EXE Has Stopped Working**:
  - `params.timeScale` is set to 0, so the world freezes while the camera still moves. A Windows-95-style dialog appears with a grey bevel, a blue title bar, an ⚠ icon and the text "UNIVERSE.EXE has stopped working." It has 3 **working** buttons:
    - **Close Program** → glitch flash plus every body teleports to a random island spot.
    - **Wait** → a 2 s fake progress bar, then resume.
    - **Blame the Intern** → toast *"The intern has been notified. The intern is you."*, then resume.
  - It restores the previous `timeScale`.
- [ ] 4.5 **The Floor Is Lava**:
  - The grass material color lerps to `#ff4d00` with a pulsing emissive, and the scene lighting tints orange.
  - Ember particles rise continuously.
  - Every citizen hops non-stop with "HOT HOT HOT" bubbles. 9 s, then it cools down.

#### C. Visual requirements
- **Resigned:** the slider moves on its own and the town floats up while a funny letter is on screen.
- **Moon:** the most cinematic moment. Day turns to night as a huge face fills the sky, the screen trembles, a gentle boop sends everything floating in moonlight, then the moon apologizes and retreats.
- **Chickens:** sixty chickens raining, bouncing and hopping everywhere. Combined with Flubber, it's chaos.

#### D. Functional requirements
- All events are triggerable through BREAK REALITY (random, no immediate repeats). Two can be active at once.
- RESTORE ends all of them and fully resets sky, lighting, gravity, `timeScale`, materials and spawned objects.
- The letter's button and all UNIVERSE.EXE buttons work.

#### E. Technical guidance
- Lighting and sky changes go through `world.setMood(name, seconds)`, which lerps between `day`, `night` and `lava` preset objects (sky uniforms, sun and hemisphere colors and intensities). Restore calls `world.setMood('day', 0.8)`. This prevents events fighting over lights.
- Overlapping events that touch the same param (gravity, timeScale) store the previous value at start and restore it at end. If restore happens first, the hook resets everything to defaults anyway.
- Debug helper during development (not shipped as UI): `window.__trigger('moon')` to test a specific event fast. Leaving it on `window` is harmless.

#### F. Definition of done
- [ ] Every implemented event plays correctly 3× and alongside each other, and restore works mid-event.
- [ ] Sky, lighting, gravity and `timeScale` always return to normal after restore or event end.
- [ ] Regression OK (S1–S3). Console clean. Committed + pushed after **each** event + verified.

#### G. STOP HERE — PRESENTABLE VERSION
**Demo (2.5 min):** previous demo, then press BREAK REALITY repeatedly. *Gravity Has Resigned*: the slider moves by itself, the town floats, and you read the resignation letter aloud. *The Moon Is Too Close*: night falls, a giant moon face approaches, BOOP, everything floats, the moon says "sorry". *Chicken Apocalypse*: it rains chickens. Show two events overlapping, then one **RESTORE REALITY** fixes everything.

#### H. Estimated time: **8 min** (2 + 3.5 + 2.5, each including a quick test and commit). Cut line: if only ≤3 min are left, ship Gravity Resigned alone.

---

### Stage 5 — Fine-Tuning Creation (7 min) → 🟠 LATER CHECKPOINT

#### A. Objective
Deepen the "god controls physics" fantasy with the 3 most visual extra controls, and give the world a voice: the **Universe News Network** ticker. By now the panel holds 5 real controls, and the universe reacts to everything.

#### B. Implementation tasks
**Essential**
- [ ] 5.1 **Time** control: a segmented button group in the panel with ⏸ Pause (0), 🐢 Slow (0.25), ▶ Normal (1), ⏩ Fast (2.5) and 🤪 Ridiculous (6). It sets `params.timeScale`.
  - Already wired by the loop (§2.3): sim, citizens, events, clouds, the clock-tower hands and debris all scale. The camera, UI and particles' own fades do not.
  - **Pause** = bullet-time: freeze a duck impact mid-air and orbit around it.
  - Toasts: "Time is on a coffee break." / "Citizens now age 6× faster. They are not thrilled."
  - Restore sets it back to Normal.
- [ ] 5.2 **Object Size**: a category `<select>` (Citizens / Trees / Houses / Everything) plus a slider from 0.25 to 4 (log-mapped).
  - Sets `params.scale[category]`. `applyScale` lerps the current scale to the target over 0.4 s. A body's `radius` scales with it.
  - Toasts: "Citizen #7 is now taller than the economy." / "Houses are now 'cozy'."
  - Restore animates all scales back to 1.
- [ ] 5.3 **UNN ticker**: a fixed bottom bar, 34 px, dark glass. On the left a red "● UNN LIVE" badge that blinks. On the right a marquee, CSS `translateX` animation, showing the last 6 headlines.
  - `ui.headline(text)` adds a headline. Events, restores and settings changes push headlines: "BREAKING: Duck Classified as Weather Event", "Moon issues formal apology", "Gravity's union demands 'down' days".
  - Idle filler every 25 s: "Local man still unaware he lives on a floating rock", "Scientists baffled; scientists also floating".
  - The BREAK REALITY button and toasts move up 34 px so nothing overlaps.

**Optional**
- [ ] 5.4 **Wind** slider (0 … 1):
  - Free bodies accelerate along +x·wind·6. Tree sway amplitude goes 0.03 → 0.35, and clouds drift faster.
  - Above 0.6, citizens detach and tumble. Above 0.9, trees detach.
  - Continuous white streak particles at 0.4+ (`fx.emit` with a stretched horizontal velocity).
  - Toast: "Light breeze. Citizens are now kites."
- [ ] 5.5 A **hidden combo**: gravity ≤ 0.05 + bounce ≥ 1.2 + citizen size ≥ 3 → secret toast + headline *"Chicken Singularity achieved"*, plus 30 chickens spawned in zero-g (reuses the S4 InstancedMesh).

#### C. Visual requirements
- The panel now has well-spaced, clearly labeled sections (Gravity, Bounciness, Time, Size, Wind). It's still compact. On short screens it scrolls inside itself.
- Ridiculous time makes citizens zoom around and the clock hands spin. Pause freezes the world mid-chaos.
- Giant citizens loom over tiny houses.
- A professional-looking but absurd news ticker scrolls constantly.

#### D. Functional requirements
- Every new control changes the world immediately and is reset by RESTORE.
- The ticker reflects real actions: each event and restore produces a headline.

#### E. Technical guidance
- Scale, wind and time all live in `ctx.params`. Modules read params each frame, so no extra event plumbing is needed beyond `ui.setParam`.
- The marquee rebuilds its text content when a headline is added. The animation duration is proportional to text length, so speed stays constant.

#### F. Definition of done
- [ ] All new controls work and restore resets them.
- [ ] No overlap between the ticker, BREAK button, toasts and panel on desktop and at a 390 px width.
- [ ] Regression S1–S4 OK. Console clean. Committed + pushed + verified.

#### G. 🟠 STOP HERE — PRESENTABLE VERSION
**Demo (3 min):** everything before, plus: pause time in the middle of the duck impact and orbit around the frozen chaos. Unpause to *Ridiculous*. Make citizens giant and houses tiny. Crank the wind (if built) and the citizens become kites. Read the UNN headlines out loud. Restore.

#### H. Estimated time: **7 min** (Time 1.5, Size 2, Ticker 1.5, test + deploy 2). Wind and combo are only done if ahead of schedule.

---

### Stage 6 — Polish & Glory (5 min)

#### A. Objective
Make the demo feel finished and rewarding: achievements with satisfying popups, a solid mobile layout and a README with the live link. No new risky systems.

#### B. Implementation tasks
**Essential**
- [ ] 6.1 Achievements (in `ui.js`). Each has a real trigger condition:
  - 🏅 **Certified Menace**: press BREAK REALITY 5 times.
  - 🍎 **Newton's Worst Nightmare**: set gravity below 0.
  - 🦆 **Duck and Cover**: survive the duck.
  - 💼 **Professional God (Unpaid)**: use RESTORE 3 times.
  - 🪐 **This Is Why We Can't Have Planets**: 2 events active at once.

  The popup is a gold glass card that slides down at the top center, showing the trophy, the title and a one-line joke, plus `chime()`. A **🏆 n/5** HUD button opens a small list with locked and unlocked states. It works.
- [ ] 6.2 Mobile (`@media (max-width: 700px)`):
  - The settings panel becomes a bottom sheet, collapsed by default and opened by a "⚙ Reality" button.
  - The BREAK button shrinks to 96 px.
  - The banner and achievement text scale down. Toasts are full width.
  - `touch-action: none` on the canvas. No horizontal scroll.
- [ ] 6.3 `README.md`: title, one-line pitch, **live URL**, a controls cheat-sheet, the tech note (static Three.js, no backend), and the list of events.
- [ ] 6.4 `<meta name="description">`, `theme-color`.

**Optional**
- [ ] 6.5 Adaptive quality: if the average frame time stays above 28 ms for 2 s, lower the pixelRatio to 1 and turn bloom off. One-time and silent.
- [ ] 6.6 More click easter eggs: the moon squeaks, a cloud rains briefly when clicked, and a house complains after 3 clicks ("I'm calling the council").

#### F. Definition of done
- [ ] All 5 achievements are unlockable in one demo run.
- [ ] A 390×844 viewport is usable: you can open the panel, press BREAK and restore.
- [ ] Regression S1–S5 OK. Console clean. Committed + pushed + verified.

#### G. STOP HERE — PRESENTABLE VERSION
The same demo as S5, now with trophies popping up as you go ("Professional God (Unpaid)" lands on the third restore, which always gets a laugh), and it works on a phone, so you can hand the phone to someone in the audience.

#### H. Estimated time: **5 min**

---

### Stage 7 — Ship It (6 min, non-negotiable) → 🔵 FINAL CHECKPOINT

#### A. Objective
Prove that the public URL works for a stranger and rehearse the demo. Nothing new is built here.

#### B. Tasks
- [ ] 7.1 If anything is uncommitted and not working: revert to the last checkpoint (`git checkout -- .`). Never ship a broken change.
- [ ] 7.2 Search for absolute paths and stray debug output: `grep -rn "src=\"/\|href=\"/\|from '/\|console.log" index.html js css`. Fix any hits.
- [ ] 7.3 Final commit + push. Wait for Pages (poll the URL until it shows the new commit's content, usually under 1 min).
- [ ] 7.4 Verify each of these returns **HTTP 200**: `/`, `/css/style.css`, `/js/main.js`, and every module in `js/`.
- [ ] 7.5 Open the public URL in a fresh Chrome tab. Run the full final demo script below. The console must be clean, with no CORS errors and no 404s.
- [ ] 7.6 Check a narrow viewport (390 px) on the live site.
- [ ] 7.7 Report the verified URL to you. Only now is it called "deployed".

#### F. Definition of done
- [ ] The live URL `https://helenandmir.github.io/Agentic-Programming-67723-lab1/` loads, plays the full demo and has a clean console, all verified by me in a browser.
- [ ] The README contains the live URL.

#### G. 🔵 FINAL — PRESENTABLE VERSION: demo script (3 min)
1. **Intro** (15 s): read the title card, click **ACCEPT QUESTIONABLE RESPONSIBILITY**, cinematic fly-in.
2. **The world** (25 s): orbit and look under the island, click a house, the town hall and a citizen for quips. Point out the real-time clock tower.
3. **Gravity** (30 s): float the town to −1, Flubber bounce, slam to 3, carnage.
4. **BREAK REALITY** (60 s): duck → moon → chickens (two overlapping). Achievements pop.
5. **Fine-tuning** (30 s): pause mid-chaos and orbit, giant citizens, ridiculous time, read UNN headlines.
6. **RESTORE REALITY** (15 s): the ring wave, everything flies home. *"Reality restored. Nobody saw anything."*

#### H. Estimated time: **6 min**

---

## 4. Feature priority matrix & Parking Lot

Decision rule: **demo impact ÷ build risk**. The goal is one spectacular, working feature rather than ten half-built ones.

| Feature (from spec) | Impact | Cost | Decision |
|---|---|---|---|
| Diorama island + citizens + intro | ★★★★★ | M | **S1** |
| Click quips + squash | ★★★★ | S | **S1** |
| Gravity slider (lift-off) + Restore wave | ★★★★★ | M | **S2** |
| Bounciness | ★★★ | XS | **S2** |
| BREAK REALITY + Duck + FX + audio | ★★★★★ | M | **S3** |
| Gravity Has Resigned | ★★★★ | XS | **S4** |
| Moon Is Too Close | ★★★★★ | M | **S4** |
| Chicken Apocalypse | ★★★★ | S | **S4** |
| UNIVERSE.EXE dialog | ★★★★ | S | S4 optional |
| Floor Is Lava | ★★★ | S | S4 optional |
| Time control (pause/ridiculous) | ★★★★ | XS | **S5** |
| Object size | ★★★★ | S | **S5** |
| UNN ticker + commentary | ★★★★ | S | **S5** |
| Wind + storm streaks | ★★★ | S | S5 optional |
| Hidden combo event | ★★★ | S | S5 optional |
| Achievements | ★★★ | S | **S6** |
| Mobile layout | ★★★ | S | **S6** |
| Intro fly-in camera | ★★★★ | XS | **S1** (cheap version) |

**Parking Lot** (only if a stage finishes early; in priority order; each is a self-contained mini-slice with its own test + commit):
1. Waterfall / smoke / birds (S1 optionals, if skipped)
2. Everything Is Magnetic: a glowing singularity orb pulls every body into a cluster ball
3. The Floor Is a Trampoline: periodic island-wide impulses with `boing()`
4. The Great House Migration: houses sprout two leg cylinders and waddle toward the edge
5. The Universe Is Having a Bad Day: trigger 2–3 compatible events at once
6. Hold-to-REWIND: a 10 s ring buffer of body transforms, played backwards
7. Click-to-focus / follow camera on an object
8. Body-to-body collisions (pairwise sphere pushes)
9. Fake scientific reports / emergency announcement modals
10. Cars and boats moving on loops

---

## 5. Risk register

| Risk | Mitigation |
|---|---|
| Pages not enabled or slow | Enable in Stage 0. First deploy in S1, with ~45 min of slack to fix it. |
| CDN import fails | Version pinned (r160) on jsDelivr. Verified in S1 on the live URL. |
| Case-sensitive paths break on Pages | Lowercase file names. Every module's live URL is checked for 200 at each checkpoint. |
| Audio blocked by autoplay policy | AudioContext created on the intro click. Every SFX no-ops safely. |
| Physics instability / explosions | dt clamp 1/30, speed clamp 40, respawn below y = −40. |
| Overlapping events conflict | Max 2 active. Mood system for lighting. Previous-value restore. Restore resets everything to defaults. |
| Performance on weak laptops | pixelRatio ≤ 2, one shadow light, bloom at half resolution, pooled particles, InstancedMesh for chickens, adaptive quality (S6 optional). |
| Running out of time | Checkpoint commits, Go/No-Go rule, clock rules (§1.1), Stage 7 reserved. |
