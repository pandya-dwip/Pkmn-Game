# 🏆 Pokémon: Kanto Cup & Journey Across Kanto

An immersive Gen 1 Pokémon adventure and tournament game built with **TypeScript**, **Vite**, **Three.js**, **Phaser 3**, and procedural **Web Audio synthesis**. Experience an authentic Pokédex-inspired handheld console featuring real-time top-down route exploration, lush volumetric 2D canvas environments, 3D animated battles, wild Pokémon catching mechanics, Kanto gym challenges, and a 64-trainer championship tournament.

---

## 🌟 Highlights & New Features

### 🌲 Interactive Top-Down Kanto Route Exploration & Unique City Architecture
- **Real-Time World Travel Across All 9 Routes:** Freely explore an expansive Kanto region (world width up to 3,600px per route) structured with clear natural zones, upper ridges, shoreline docks, and fully realized town grids.
- **Distinct Visual Look & Architecture For Every City:**
  - **Viridian City (Route 0 - Evergreen Garden City):** Ivory sandstone ashlar flagstones with natural stone curbs, emerald and terracotta pitched roofs, flourishing tulip flowerboxes, central tiered marble fountain, Pokémon Center, Poké Mart, Trainer Academy, and cozy botanist cottages.
  - **Pewter City (Route 1 - Mt. Moon Stone Mining City):** Dark chiseled granite and slate cobblestone avenues, charcoal and slate roofs, solid meteor rock fountain, Brock's Rock-type Gym, Geologist Flint's cottage, Fossil Research Lab, quarry foreman lodge, and scattered Mt. Moon boulders.
  - **Cerulean City (Route 2 - Floral Water & Canal City):** Cyan and azure marine stone pavers with blue mortar lines, flowing freshwater canals with walkable wooden fishing piers, central azure cascade fountain, Bike Shop Villa, Berry Herbalist Cottage, Water Breeder's Lodge, and Swimmer's Oasis.
  - **Vermilion City (Route 3 - Lightning Harbor Port):** Warm terracotta brickwork avenues and waterfront boardwalks, harbor bay with fishing docks, central stone anchor piazza and fountain, Pokémon Fan Club, Sailor's Quarters, Old Rod Guru's Cottage, and Dockmaster Office under salty sea breezes.
  - **Celadon City (Route 4 - Rainbow Metropolis):** Grand pastel and purple marble boulevards, 5-story Celadon Department Store, royal floral marble fountain, Erika's lush greenhouse Gym, Celadon Perfumery Villa, Game Corner suite, Botanist Manor, and gilded gold streetlamps.
  - **Fuchsia City (Route 5 - Historic Ninja & Safari Town):** Earthen amber timber and stone pavers, serene Zen koi pond with wooden bridge, stone basin fountain, traditional Japanese stone lanterns, Safari Zone Warden Slowpoke's Villa, Ninja Technique Dojo with Apprentice Raizo, Poison Herbalist shanty, and conservation pens.
  - **Saffron City (Route 6 - Golden Tech Metropolis):** Platinum and gold high-tech metropolis pavers, Silph Co. headquarters, central magnetic hydro-fountain, futuristic cyan LED streetlamps, Silph Senior Engineer Manor, Fighting Dojo Master Koichi's hall, Copycat's quirky villa, and Telekinesis lab.
  - **Cinnabar Island (Route 7 - Volcanic Isle & Geothermal Springs):** Volcanic basalt and obsidian cobblestones with crimson curbs, smoldering thermal springs, caldera magma stone fountain, Blaine's Fire Gym, Fossil Resurrection Lab, Volcanologist Dr. Volcan's villa, beach shacks, and volcanic torches.
  - **Indigo Plateau (Route 8 - Champions Imperial Citadel):** Imperial white marble and gold paved victory avenues, central Victory Fountain, gilded lanterns, Champion Lance's dragon pavilion, Elite Four council manor, League headquarters, and Veteran Champion Blue's sanctuary.
- **Volumetric 2D Canvas Graphics & Living Scenery:**
  - **Volumetric Tree Canopies:** Natural multi-lobed foliage with directional sunlight gradients, leafy cluster highlights, gnarled trunks, root flares, and theme-specific trees (Lush Oaks, Mt. Moon Pines, Pink Cherry Blossoms, and Mystic Glowing Oaks).
  - **Interactive Residential Houses & Cottages:** Foundation plinths, horizontal siding, timber posts, pitched gables with dynamic styles (`terracotta`, `emerald`, `slate`, `azure`, `wood`), real-time animated chimney smoke puffs, cross-mullion glowing windows with tulip flowerboxes, paneled wooden doors with polished brass doorknobs, illuminated porch coach lanterns, and resident NPC dialogues.
  - **Civic Amenities:** Central animated fountains with water ripples and splash droplets, adaptive streetlamps with warm radial ground lighting pools, wrought-iron and wooden park benches with collision support, and garden picket fences.
  - **Organic Terrain & Trails:** Velvety grass turf with procedural micro-clovers and dandelions. Routes feature authentic dirt trails with embedded 3D river cobblestones and scalloped edges, transitioning smoothly into city stone avenues.
  - **Dynamic Swaying Tall Grass:** Wind-responsive blades that part when walked through, accompanied by blooming meadow wildflowers (buttercups, poppies, bluebells, lavender, and daisies). Safe lawn turf and paved streets guarantee 0 wild encounters until stepping into tall grass.
  - **Atmospheric Lighting & Particles:** Diagonal volumetric sunbeams (god-rays), drifting autumn leaves, floating sakura petals, and golden pollen motes.
  - **Detailed Red/Ash Trainer Sprite:** Shaded baseball cap, red vest, indigo jeans, sneakers, and smooth 4-frame walking animations.
- **Architectural Buildings & Key Landmarks:**
  - **🏥 Pokémon Center:** 3D crimson roof, cream stucco, glowing amber windows, cyan automatic doors, antenna mast with blinking beacon, and an illuminated Poké Ball crest. Restores party HP to 100%.
  - **🛒 Poké Mart:** Royal-blue scalloped roof, showcase display window with mini 3D items, striped awning, potted shrubs, and full item store.
  - **🏆 Kanto League Gyms:** Neoclassical arenas with fluted columns, pediments, blazing braziers, and glowing elemental badge crystals.
  - **🚪 Route Gatehouses:** Historic brick checkpoints with arched passageways leading to the next region.
- **Ground Items, Dynamic HUD & Interactive NPCs:** Dropped Poké Balls, Berries, and Poké Dollars with sparkle animations; interactive NPC residents offering regional lore, combat hints, and gifts; and real-time section location HUD banners.
- **Position Persistence:** Automatically saves and resumes your exact coordinates on the route upon completing battles, shopping, or gym challenges.

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
