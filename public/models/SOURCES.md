# 3D model sources

All environment and character models used by the 3D chase view are **CC0 1.0 (public domain)** or **CC-BY 3.0** (credit below).
CC0 needs no credit (given anyway); CC-BY models are credited in the poly.pizza table below. Each kit folder keeps its original `License.txt`.

| Folder | Kit | Author | Source | Licence |
| --- | --- | --- | --- | --- |
| `quaternius/` | Stylized Nature MegaKit (Standard / free edition) | Quaternius | https://quaternius.com/packs/stylizednaturemegakit.html | CC0 1.0 |
| `kenney/nature/` | Nature Kit 2.1 | Kenney | https://kenney.nl/assets/nature-kit | CC0 1.0 |
| `kenney/town/` | Fantasy Town Kit 2.0 | Kenney | https://kenney.nl/assets/fantasy-town-kit | CC0 1.0 |
| `kenney/suburban/` | City Kit (Suburban) | Kenney | https://kenney.nl/assets/city-kit-suburban | CC0 1.0 |
| `kenney/commercial/` | City Kit (Commercial) 2.1 | Kenney | https://kenney.nl/assets/city-kit-commercial | CC0 1.0 |
| `kenney/characters/` | Mini Characters 2.0 | Kenney | https://kenney.nl/assets/mini-characters | CC0 1.0 |

Only the files the game uses are shipped (GLB/glTF, shared 512 px colour maps).
Which model appears where is configured in `src/world/LocationEnvironment.ts`;
loading and caching live in `src/world/EnvironmentAssets.ts`.

Kenney Nature Kit models are untextured; their pastel material colours are
re-tinted to natural greens / browns / greys at load time (`NATURE_PALETTE`).

## poly.pizza models (`polypizza/`)

Downloaded from [poly.pizza](https://poly.pizza). Embedded textures were downscaled to at most 256 px to keep the game light; geometry is unchanged.
**CC-BY 3.0** models require attribution, given here (https://creativecommons.org/licenses/by/3.0/). **CC0** models need none; credit is given anyway.

| File | Model | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `acacia.glb` | Acacia | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/0j86RMO4kQC |
| `autumn.glb` | Autumn Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/2lRubrT6Na |
| `bamboo.glb` | Bamboo | Quaternius | CC0 1.0 | https://poly.pizza/m/xBPj13w3JQ |
| `barn.glb` | Barn | Quaternius | CC0 1.0 | https://poly.pizza/m/vSqQNA7ez6 |
| `birch.glb` | Birch Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/k6cozoNfLH |
| `birch_snow.glb` | Birch Tree with Snow | Quaternius | CC0 1.0 | https://poly.pizza/m/R4NgnzZHcK |
| `blossom_white.glb` | Tree | Zsky | CC-BY 3.0 | https://poly.pizza/m/VfZbAkek1r |
| `bonsai_pot.glb` | Bonsai | Zsky | CC-BY 3.0 | https://poly.pizza/m/f7SPcHbOxQ |
| `bridge_small.glb` | Small Bridge | Quaternius | CC0 1.0 | https://poly.pizza/m/j4KsIuJYnq |
| `cherry.glb` | Cherry tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/1FSDzk-LRdA |
| `container_grey.glb` | Shipping Container | Quaternius | CC0 1.0 | https://poly.pizza/m/dQXRtm5GbO |
| `container_red.glb` | Container Red | Quaternius | CC0 1.0 | https://poly.pizza/m/vzzCNUB6Zn |
| `cottage.glb` | Cottage | CreativeTrio | CC0 1.0 | https://poly.pizza/m/YDGLLT0emC |
| `cypress.glb` | Cypress Tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/eUQDPAFMQfv |
| `dead_dark.glb` | Dead Tree with Snow | Quaternius | CC0 1.0 | https://poly.pizza/m/PILl2nbDNz |
| `dead_pale.glb` | Dead tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/aPFov1IaCWu |
| `dock_long.glb` | Dock Long | Quaternius | CC0 1.0 | https://poly.pizza/m/bN9Oz3niNm |
| `flattop.glb` | Tree | Marc Solà | CC-BY 3.0 | https://poly.pizza/m/6Yjt8nIwLsD |
| `fountain_tiered.glb` | Fountain | Isa Lousberg | CC0 1.0 | https://poly.pizza/m/WHc7dwttlk |
| `fox_statue.glb` | Fox Statue | Quaternius | CC0 1.0 | https://poly.pizza/m/abxyXID5EA |
| `gazebo.glb` | Gazebo | Quaternius | CC0 1.0 | https://poly.pizza/m/xYZB1TmGMv |
| `greenhouse.glb` | Greenhouse | J-Toastie | CC-BY 3.0 | https://poly.pizza/m/exys3emjr1 |
| `hut_b.glb` | House | Quaternius | CC0 1.0 | https://poly.pizza/m/L7h0SjZX2K |
| `lab_a.glb` | Large Building | Kenney | CC0 1.0 | https://poly.pizza/m/ppwtREejXg |
| `lab_b.glb` | Large Building | Kenney | CC0 1.0 | https://poly.pizza/m/h7Jaq7bqMq |
| `lantern_post.glb` | Street Lantern | Isa Lousberg | CC0 1.0 | https://poly.pizza/m/Zp1b44poac |
| `lighthouse.glb` | Light House | MaverickFX | CC0 1.0 | https://poly.pizza/m/KRebJXIRb8 |
| `lighthouse_b.glb` | Lighthouse | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/7H8is9jrGeB |
| `liner.glb` | Cruise liner | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/cPiY_8RZMHE |
| `log_cabin.glb` | Log cabin | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/f7uccD5iyz0 |
| `maple_red.glb` | Maple tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/8OfF21t6NMa |
| `market_stand.glb` | Market Stand | Quaternius | CC0 1.0 | https://poly.pizza/m/DGIM5HGISb |
| `oak_round.glb` | Oak tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/0DtsZfSTWzA |
| `office_a.glb` | Large Building | Kenney | CC0 1.0 | https://poly.pizza/m/3IhrYZp6tP |
| `office_b.glb` | Large Building | Kenney | CC0 1.0 | https://poly.pizza/m/1bt4yYKmuK |
| `pagoda.glb` | Pagoda | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/1zS7ucaAd4J |
| `palm_a.glb` | Palm Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/A6cKJYFsIb |
| `palm_b.glb` | Palm Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/P0tgwyXBgr |
| `palm_bent.glb` | Palm Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/nr1B5DbICA |
| `palm_lean.glb` | Palm tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/2RUnO1Yi99P |
| `palm_tall.glb` | Palm tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/5Be_cBXw1ie |
| `pine_snow.glb` | Pine Tree with Snow | Quaternius | CC0 1.0 | https://poly.pizza/m/17vQv2X5rh |
| `poplar.glb` | Poplar Tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/2y-Cl3E7lMf |
| `port.glb` | Shipping Port | Quaternius | CC0 1.0 | https://poly.pizza/m/mJXJPCIkbM |
| `sailboat.glb` | Sail Boat | Quaternius | CC0 1.0 | https://poly.pizza/m/BgSZXwmm7k |
| `savanna.glb` | Tree from the savanna | hat_my_guy | CC0 1.0 | https://poly.pizza/m/uLxXsCfYb7 |
| `silo.glb` | Silo House | Quaternius | CC0 1.0 | https://poly.pizza/m/ZgstejsAcN |
| `spruce.glb` | Spruce tree | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/ahT2_ZxtLIq |
| `stadium.glb` | Football stadium | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/6TZCkGh76m5 |
| `station.glb` | Japanese Train Station | Andrew-John Hickman | CC-BY 3.0 | https://poly.pizza/m/f2ZQl-lX0gM |
| `stone_house.glb` | Fantasy House | Quaternius | CC0 1.0 | https://poly.pizza/m/he3p42mUTH |
| `streetlight.glb` | Street Light | Quaternius | CC0 1.0 | https://poly.pizza/m/nFwrlcLvM5 |
| `timber_house.glb` | House | Quaternius | CC0 1.0 | https://poly.pizza/m/vZ1CLbWmSx |
| `timber_tall.glb` | Fantasy House | Quaternius | CC0 1.0 | https://poly.pizza/m/BH2XHWUNmF |
| `torii.glb` | Torii Gate | Hattie Stroud | CC-BY 3.0 | https://poly.pizza/m/07__lYTDdEH |
| `tugboat.glb` | Tugboat | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/eEbXA8_6MeJ |
| `volcano.glb` | Volcano | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/4xoTMiF0D5J |
| `water_tower.glb` | Water Tower | Quaternius | CC0 1.0 | https://poly.pizza/m/tMK8bhapAK |
| `willow.glb` | Weeping willow | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/74_FuSwEd0E |
| `willow_big.glb` | Willow | Quaternius | CC0 1.0 | https://poly.pizza/m/mBrUbIp9Zd |
| `fountain_blue.glb` | Fountain | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/4KKY7CmNe_r |
| `fountain_garden.glb` | Garden with Pond and Arches | Bruno Oliveira | CC-BY 3.0 | https://poly.pizza/m/52RaBNIylW7 |
| `fountain_grand.glb` | Santo Spirito Fountain | Don Carson | CC-BY 3.0 | https://poly.pizza/m/7b_tCaBRLCI |
| `fountain_grass.glb` | Fountain | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/7AydBrjR2Ss |
| `fountain_iron.glb` | Water Fountain | Zsky | CC-BY 3.0 | https://poly.pizza/m/2guUSHGDPZ |
| `fountain_rockpool.glb` | Pond | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/5rf3YuZfJAW |
| `fountain_statue.glb` | Town Center | Quaternius | CC0 1.0 | https://poly.pizza/m/cuQuFJEIfH |
| `fountain_waterfall.glb` | Waterfall | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/7mrPbZToHh2 |
| `well_stone.glb` | Well | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/an8wpvcJi8X |
| `colosseum.glb` | Colosseum | CreativeTrio | CC0 1.0 | https://poly.pizza/m/83ftBPyiSf |
| `greek_temple.glb` | Greek Temple | Alexandre Thomas (Ashtom) | CC-BY 3.0 | https://poly.pizza/m/cdMQnl19MB9 |
| `grand_hall.glb` | Big Building | Quaternius | CC0 1.0 | https://poly.pizza/m/AVCS8jUd2l |
| `flag_red.glb` | Flag | Quaternius | CC0 1.0 | https://poly.pizza/m/FuOkF3WBrx |
| `flag_banner.glb` | Flag | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/0okBVouy3-T |
| `horse_statue.glb` | Horse Statue | Quaternius | CC0 1.0 | https://poly.pizza/m/AK9CmjFnL6 |
| `hero_statue.glb` | Statue | Zsky | CC-BY 3.0 | https://poly.pizza/m/0Mkdl3SJDT |
| `fountain_classic.glb` | Fountain | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/0YTMlW0CUHU |
| `fountain_pedestal.glb` | Water fountain made in Blocks | The Sabby Life | CC-BY 3.0 | https://poly.pizza/m/cZoDn3K30Vd |
| `wishing_well.glb` | Wishing Well | Don Carson | CC-BY 3.0 | https://poly.pizza/m/4H4zAj62ulP |
