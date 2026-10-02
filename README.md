# 🏆 Pokémon Kanto Cup Tournament

A Gen 1 Pokémon tournament roguelite game built with **TypeScript**, **Vite**, **Three.js**, **Phaser 3**, and the **Pokémon 3D API**. Experience a 64-trainer bracket tournament rendered in an authentic Pokédex Red & White physical chassis with animated 3D battles, procedural audio synthesizers, team management, evolutions, and tournament roguelite progression.

---

## ⚡ Features

- **🎮 64-Trainer Elimination Tournament:** Battle through 6 rounds (Round 1, Round 2, Round 3, Quarter Finals, Semi Finals, and Grand Finals) to claim the Kanto Championship trophy.
- **✨ 3D Pokémon Model Rendering & Animations:**
  - Real-time 3D battle arena powered by Three.js and the official Pokémon 3D API ecosystem.
  - Procedural combat idle engine: living breathing animations, boxer bounce, weight shifts, head tracking, and dynamic bone relaxation (eliminates T-poses).
  - Physical and special attack lunges, critical hit camera shakes, dynamic lighting, and faint transitions.
- **🍓 Multi-Tier Berry & Item Economy:**
  - **Oran Berry (30% HP)**, **Sitrus Berry (50% HP)**, **Enigma Berry (75% HP)**, **Full Heal Berry (100% HP)**, and **Revives**.
  - Guaranteed Revives and Full Max Health berries rewarded after every tournament victory.
- **⚡ Evolution System & Special Evolutions:**
  - Full HP restoration upon all evolutions (level-up, evolution stones, and special evolutions).
  - Special Evolutions allow multi-stage progression (e.g. Charmander → Charmeleon → Charizard) with +2 level bonuses for 2nd stage and +4 level bonuses for 3rd stage final forms.
- **🩹 Match Complete Quick Actions:**
  - One-click **Quick Train**, **Quick Heal**, and **Max Heal** buttons on the post-match hub screen.
- **📱 Fully Responsive Mobile-First Design:**
  - Pokédex-inspired physical chassis with metallic bevels, glass lenses, tactile LEDs, and responsive scaling from mobile phones to high-res desktop screens.
  - Clean Hall of Fame induction certificate with responsive squad card showcase.
- **🔊 Procedural Web Audio Synthesizer:** Authentic 8-bit style chiptunes, retro cries, move sound effects, and healing fanfares without external audio file dependencies.

---

## 🛠️ Tech Stack

- **Runtime & Build:** [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **3D Graphics & Rendering:** [Three.js](https://threejs.org/) + GLTFLoader + Draco Compression Decoder
- **Game Engine & FX:** [Phaser 3](https://phaser.io/)
- **Assets:** [Pokemon-3D-api](https://github.com/Pokemon-3D-api) + [PokeAPI Official Artwork](https://pokeapi.co/)
- **Audio:** Web Audio API (Synthesizer & Chiptune Music Generator)
- **Styling:** Vanilla CSS with custom design tokens, Pokédex Red & White theme, and fluid responsive layouts

---

## 🚀 Getting Started

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
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production
```bash
npm run build
```
This runs TypeScript type checking (`tsc`) and bundles optimized production assets into `dist/`.

---

## 🌐 Deploy to Vercel

This repository is pre-configured with `vercel.json` for one-click deployment:

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. Framework Preset will automatically detect **Vite**:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**!

---

## 📄 License

This is an educational, non-commercial fan-made project. Pokémon and Pokémon character names and assets are trademarks of Nintendo, Creatures Inc., and GAME FREAK.
