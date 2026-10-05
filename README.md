# 🏆 Pokémon: Kanto Cup & Journey Across Kanto

An immersive Gen 1 Pokémon adventure and tournament game built with **TypeScript**, **Vite**, **Three.js**, **Phaser 3**, and procedural **Web Audio synthesis**. Experience an authentic Pokédex-inspired handheld console featuring real-time top-down route exploration, lush volumetric 2D canvas environments, 3D animated battles, wild Pokémon catching mechanics, Kanto gym challenges, and a 64-trainer championship tournament.

---

## 🌟 Highlights & New Features

### 🌲 Interactive Top-Down Kanto Route Exploration
- **Real-Time World Travel:** Freely explore iconic Kanto routes (Route 1 through Viridian City, Route 2 through Pewter City, Cerulean, Vermilion, Celadon, Fuchsia, Saffron, Cinnabar, and the Indigo Plateau).
- **Volumetric 2D Canvas Graphics:**
  - **Volumetric Tree Canopies:** Natural multi-lobed foliage bodies with directional sunlight gradients, leafy cluster highlights, gnarled oak trunks, root flares, and organic height/scale variations.
  - **Organic Terrain & Trails:** Multi-tone velvety lawns with procedural turf dappling, wild four-leaf clover clusters, and yellow meadow dandelions. Country trails feature organically scattered 3D river cobblestones, sun-baked walking lanes, and soft scalloped grass borders. City plazas feature weathered ashlar flagstones with 3D beveled edges, mortar lines, and chiseled granite curbs.
  - **Dynamic Swaying Tall Grass:** Rounded mossy soil beds with soft depth shadows, multi-layered curved blades with 2-phase wind ripples, reactive blade parting as the trainer walks through, and embedded blooming wild meadow flowers (buttercups, poppies, bluebells, lavender, and daisies).
  - **Atmospheric Lighting & Particles:** Diagonal volumetric sunbeams (god-rays) streaming from the canopy, accompanied by floating leaves, cherry blossom petals, and golden pollen dust motes drifting across the screen.
  - **Detailed Red/Ash Trainer Sprite:** Shaded baseball cap with white Poké Ball emblem and dark visor shadow, layered red vest with white collar, indigo denim jeans with knee crease highlights, red sneakers with white rubber soles, and a fluid 4-frame walking stride.
- **Architectural Buildings:**
  - **🏥 Pokémon Center:** 3D curved crimson roof with terracotta shingles, white ridge caps, cream stucco siding, sky-blue corner pilasters, glowing amber transom windows with blooming tulip flowerboxes, cyan automatic sliding glass doors, communications mast with blinking navigation beacon, and an illuminated 3D Poké Ball crest with a pulsing cyan/white LED button. Heals your entire party to 100% HP.
  - **🛒 Poké Mart:** Royal-blue scalloped hipped roof, ivory brick facade, storefront display showcase window with mini 3D potions and Poké Balls on wooden shelves beneath a 3D scalloped blue-and-white awning, decorative potted shrub, illuminated gold sign, and full shopping interface.
  - **🏆 Kanto League Gyms:** Monumental classical battle arenas with 3-tier marble steps, ashlar granite courses, triangular pediment, 4 fluted neoclassical columns, dark oak double portals with knockers, stone braziers with dancing dynamic fire tongues casting warm flickering light, and a radiant pulsing elemental badge crystal.
  - **🚪 Route Gatehouses:** Weathered red brick checkpoints with arched passage tunnels and glowing wrought-iron coach lanterns.
- **Ground Items & Interactive NPCs:** Collect ground-dropped Poké Balls, Berries, and Poké Dollars with shiny particle gleams, and speak with animated NPCs for tips, lore, and gifts.
- **Position Persistence:** Return seamlessly to your exact coordinates on the route after completing wild battles, gym matches, or shopping trips.

---

### ⚾ Wild Pokémon Encounters & Physics Catching System
- **Grass Encounters:** Rustling tall grass leads seamlessly into real wild Pokémon battles.
- **Cinematic Poké Ball Throw & Capture Animation:**
  - True parabolic SVG projectile arc with rotational spin and dynamic drop shadow.
  - Radiant energy capture beam vortex drawing the wild Pokémon inside.
  - Dual ground bounces with physical deceleration.
  - Suspenseful tension wobbles with center LED status indicator (pulsing red during tension, brilliant starburst illumination on successful capture).
- **Post-Battle Rewards:** Earn Poké Dollars and experience from wild victories. Every 5 wild battles, as well as arriving at new cities, automatically awards **5 fresh training sessions**.

---

### ⚔️ Hybrid 3D / 2D Battle Engine
- **Three.js 3D Battles:** Real-time 3D Pokémon models powered by Draco-compressed GLTF models and the Pokémon 3D API ecosystem.
- **Living Combat Animations:** Procedural breathing cycles, boxer bounce, weight shifts, head tracking, physical attack lunges, critical hit camera shakes, and faint transitions.
- **High-Definition 2D Fallback:** Smooth fallback to animated high-resolution 2D sprites with customizable 3D/2D toggle and quality settings in the settings menu.
- **Elemental Attack FX:** Vibrant visual animations for physical and special moves (Ember, Flamethrower, Water Gun, Hydro Pump, Thunderbolt, Razor Leaf, Psychic, etc.).

---

### 🏛️ Kanto Gym Progression & 64-Trainer Tournament
- **8 Kanto Gym Leaders:** Challenge Brock, Misty, Lt. Surge, Erika, Koga, Sabrina, Blaine, and Giovanni to earn official League Badges.
- **Fair Roguelite Progression:** Failing a Gym challenge allows continuing directly from that Gym without resetting your entire journey. Complete game restarts only occur if defeated in the Grand Tournament.
- **64-Trainer Elimination Tournament:** A 6-round bracket tournament (Round 1, Round 2, Round 3, Quarter Finals, Semi Finals, and Grand Finals) to decide the Kanto Champion.
- **Hall of Fame:** Earn an official induction certificate and victory showcase upon claiming the championship trophy.

---

### 🎒 Economy, Bag & Evolution System
- **Comprehensive Item Economy:**
  - **Poké Balls:** Poké Ball, Great Ball, Ultra Ball, and Master Ball.
  - **Berries & Medicines:** Oran Berry (30% HP), Sitrus Berry (50% HP), Enigma Berry (75% HP), Full Heal Berry (100% HP), Max Potion, and Revives.
  - **Evolution Stones:** Fire Stone, Water Stone, Thunder Stone, Leaf Stone, and Moon Stone.
- **Evolution Mechanics:** Full HP restoration upon all evolutions (level-up, evolution stones, and special evolutions) with progressive stat boosts for 2nd and 3rd stage forms.
- **Post-Match Quick Actions:** Instant **Quick Train**, **Quick Heal**, and **Max Heal** buttons on the post-match hub screen.

---

### 🕹️ Pokédex Handheld Hardware Design & Controls
- **Authentic Pokédex Chassis:** Crimson red casing with chamfered metallic bevels, camera sensor lens with anti-reflective blue-cyan glint, and three tactile status LEDs (Red, Amber, Green) with lens diffusion and breathing pulses.
- **Glassmorphic Route HUD:** Floating frosted bar with blur effects, glowing location badge, emerald encounter indicator gems, and quick access to the Bag and Party menu.
- **Continuous Mobile Virtual D-Pad:** Ergonomic matte-slate D-pad supporting continuous touch-drag tracking, illuminated sky-blue active feedback, and central tactile nub.
- **Interactive Jewel "A" Button:** Ruby/carnelian action button with polished gold rim and an animated proximity `.pulse` glow whenever near an interactable NPC, building, or route exit.
- **Centered Modern Modals:** Responsive dialogs and menus with frosted glassmorphism, rounded corners, and centered action buttons.

---

### 🔊 Procedural Web Audio Synthesizer
- Pure procedural sound engine built on the Web Audio API without heavy external audio files.
- Authentic 8-bit chiptune melodies, route themes, gym leader battle music, retro Pokémon cries, move sound effects, Poké Ball bounce audio, and victory fanfares.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Core & Build** | [Vite 8](https://vitejs.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| **3D Rendering** | [Three.js](https://threejs.org/) + GLTFLoader + Draco Compression Decoder |
| **2D Engine & Battle FX** | [Phaser 3](https://phaser.io/) + HTML5 Canvas API |
| **Assets** | [Pokemon-3D-api](https://github.com/Pokemon-3D-api) + [PokeAPI Official Artwork](https://pokeapi.co/) |
| **Audio** | Web Audio API (Procedural Chiptune Synthesizer & Sound Effects) |
| **UI & Styling** | Vanilla CSS (Glassmorphism, custom design tokens, responsive viewport scaling) |

---

## 🚀 Quick Start Guide

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/pkmn-game.git
cd pkmn-game
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or the port specified by Vite in terminal) in your browser.

### 4. Build for production
```bash
npm run build
```
Executes TypeScript type checking (`tsc`) and compiles optimized assets into `dist/`.

---

## 🎮 Controls

### Desktop Keyboard
- **Move Trainer:** `W` / `A` / `S` / `D` or `Arrow Keys`
- **Interact / Talk / Enter:** `Space` / `E` / `Enter` / `Z` (or `A` when standing near interactable)
- **Open Party & Bag Menu:** `Escape` or Click `🎒 MENU`

### Mobile & Touch Devices
- **Continuous Virtual D-Pad:** Slide your thumb smoothly in any direction (Up, Down, Left, Right) to steer Trainer Red.
- **Action Button [A]:** Tap the glowing red button on the bottom right to talk to NPCs, enter buildings, open route gates, and pick up items.
- **Top HUD Bar:** Tap `🎒 MENU` to manage your team, use items, or view badges.

---

## 🌐 Deployment to Vercel

This repository includes a production-ready `vercel.json` configuration:

1. Push your repository to your GitHub account.
2. Log into [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your repository.
4. Framework Preset will automatically be detected as **Vite**:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**.

---

## 📄 License & Disclaimer

This project is an educational, non-commercial fan-made tribute. Pokémon, Pokémon character names, sprites, and trademarks are copyright © Nintendo, Creatures Inc., and GAME FREAK Inc.
