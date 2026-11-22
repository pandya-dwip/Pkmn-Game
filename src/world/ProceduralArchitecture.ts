/**
 * Procedural, textured architecture for the 3D chase view ("gen:" building styles).
 *
 * Each building is assembled from storeys with painted façade bays (plaster, brick,
 * ashlar stone, timber framing or glass curtain wall), a distinct ground floor
 * (shopfronts, arcades), cornices and plinths, and a real roof (hipped, gabled, flat
 * with parapet, or a glass vault) plus details: porticos with columns and pediments,
 * balconies, chimneys, awnings, domes, clock towers, flags and lanterns.
 *
 * Every part is merged into one mesh per material, so a whole building costs only a
 * handful of draw calls. Textures and materials are shared across buildings and visits.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { RouteBuilding } from '../systems/RouteExplorationEngine';
import { markShared } from './EnvironmentAssets';
import {
  type WallKind, type RoofKind, type FacadeOpts,
  upperBayTexture, groundBayTexture, doorTexture, roofTexture, surfaceTexture, awningTexture, conservatoryGlassTexture,
} from './ProceduralTextures';

export interface ArchSpec {
  floors: number;
  floorH: number;
  wall: WallKind;
  color: string;
  trim: string;
  ground: 'shop' | 'arcade' | 'plain';
  groundWall?: WallKind;
  groundColor?: string;
  roof: 'hip' | 'gable' | 'flat' | 'vault';
  roofKind: RoofKind;
  /** Roof rise as a fraction of the building depth. */
  pitch?: number;
  overhang?: number;
  arch?: boolean;
  shutters?: string;
  boxes?: boolean;
  timberFrame?: string;
  door?: string;
  portico?: number; // number of columns
  dome?: RoofKind;
  tower?: boolean;
  cupola?: boolean;
  chimneys?: number;
  balcony?: boolean;
  awning?: [string, string];
  flags?: string;
  doubleRoof?: boolean;
  lanterns?: boolean;
  bay?: number;
}

/** The League city's building styles. */
export const ARCH_STYLES: Record<string, ArchSpec> = {
  'gen:lodge': { floors: 3, floorH: 30, wall: 'plaster', color: '#f3e6cf', trim: '#fbf7ef', ground: 'arcade', groundWall: 'stone', groundColor: '#d9cbb0', roof: 'hip', roofKind: 'terracotta', pitch: 0.32, overhang: 6, shutters: '#3f6b4a', boxes: true, balcony: true, chimneys: 2, door: '#5b3a22' },
  'gen:lodge_slate': { floors: 3, floorH: 30, wall: 'brick', color: '#9e4a35', trim: '#f1ece2', ground: 'plain', groundWall: 'stone', groundColor: '#cfc6b6', roof: 'hip', roofKind: 'slate', pitch: 0.36, overhang: 5, boxes: true, balcony: true, chimneys: 3, door: '#1f3a5f' },
  'gen:cafe': { floors: 2, floorH: 28, wall: 'plaster', color: '#fbe5c4', trim: '#5b3a22', timberFrame: '#5b3a22', ground: 'shop', groundWall: 'brick', groundColor: '#a5583a', roof: 'gable', roofKind: 'wood', pitch: 0.5, overhang: 7, awning: ['#b91c1c', '#fff7ed'], chimneys: 1, door: '#7c2d12' },
  'gen:library': { floors: 2, floorH: 34, wall: 'stone', color: '#e4dccb', trim: '#f5f0e6', ground: 'plain', roof: 'hip', roofKind: 'copper', pitch: 0.22, overhang: 4, arch: true, portico: 4, dome: 'copper', door: '#3b2a1a' },
  'gen:dojo': { floors: 1, floorH: 44, wall: 'timber', color: '#c9a77a', trim: '#3b2a1a', ground: 'plain', groundWall: 'timber', groundColor: '#c9a77a', roof: 'hip', roofKind: 'slate', pitch: 0.3, overhang: 14, doubleRoof: true, lanterns: true, door: '#3b2a1a' },
  'gen:tutor': { floors: 2, floorH: 30, wall: 'plaster', color: '#dcefff', trim: '#ffffff', ground: 'plain', roof: 'hip', roofKind: 'azure', pitch: 0.34, overhang: 6, arch: true, shutters: '#1e40af', boxes: true, cupola: true, door: '#1e3a8a' },
  'gen:market': { floors: 1, floorH: 36, wall: 'brick', color: '#b86b45', trim: '#f8f4ea', ground: 'shop', groundWall: 'brick', groundColor: '#b86b45', roof: 'gable', roofKind: 'emerald', pitch: 0.42, overhang: 8, awning: ['#15803d', '#f0fdf4'], door: '#14532d' },
  'gen:lounge': { floors: 3, floorH: 30, wall: 'glass', color: '#e2e8f0', trim: '#cbd5e1', ground: 'shop', groundWall: 'stone', groundColor: '#e5e7eb', roof: 'flat', roofKind: 'gravel', flags: '#dc2626', door: '#1f2937' },
  'gen:fanclub': { floors: 2, floorH: 28, wall: 'brick', color: '#c46a7a', trim: '#fff1f2', ground: 'shop', groundWall: 'brick', groundColor: '#b45a6a', roof: 'gable', roofKind: 'terracotta', pitch: 0.48, overhang: 6, awning: ['#db2777', '#fdf2f8'], boxes: true, flags: '#f472b6', door: '#831843' },
  'gen:hotel': { floors: 6, floorH: 28, wall: 'stone', color: '#ece4d4', trim: '#fffaf0', ground: 'arcade', groundWall: 'stone', groundColor: '#cbbfa8', roof: 'hip', roofKind: 'copper', pitch: 0.28, overhang: 3, arch: false, balcony: true, boxes: false, flags: '#1d4ed8', door: '#3b2a1a' },
  'gen:school': { floors: 2, floorH: 30, wall: 'brick', color: '#a8553c', trim: '#f8fafc', ground: 'plain', groundWall: 'brick', groundColor: '#a8553c', roof: 'gable', roofKind: 'slate', pitch: 0.42, overhang: 5, tower: true, chimneys: 2, door: '#1e3a8a' },
  'gen:conservatory': { floors: 1, floorH: 40, wall: 'glass', color: '#f8fafc', trim: '#ffffff', ground: 'plain', roof: 'vault', roofKind: 'copper', door: '#f8fafc' },
  'gen:pavilion': { floors: 1, floorH: 38, wall: 'plaster', color: '#fdf8e6', trim: '#ffffff', ground: 'plain', roof: 'hip', roofKind: 'emerald', pitch: 0.38, overhang: 10, arch: true, cupola: true, portico: 4, door: '#14532d' },
  'gen:hq': { floors: 4, floorH: 32, wall: 'stone', color: '#e9e1cf', trim: '#fffaf0', ground: 'arcade', groundWall: 'stone', groundColor: '#cdbfa4', roof: 'hip', roofKind: 'slate', pitch: 0.26, overhang: 4, arch: true, portico: 6, tower: true, flags: '#dc2626', door: '#3b2a1a' },
  'gen:gallery': { floors: 2, floorH: 36, wall: 'stone', color: '#efe8da', trim: '#fffaf0', ground: 'plain', roof: 'flat', roofKind: 'gravel', arch: true, portico: 6, door: '#3b2a1a' },
  'gen:welcome': { floors: 2, floorH: 32, wall: 'plaster', color: '#f5efe3', trim: '#ffffff', ground: 'arcade', groundWall: 'stone', groundColor: '#d6c9ae', roof: 'hip', roofKind: 'azure', pitch: 0.3, overhang: 6, arch: true, portico: 4, flags: '#dc2626', boxes: true, door: '#1e3a8a' },
};

// ----------------------------------------------------------------------------- materials

const mats = new Map<string, THREE.Material>();
function mat(key: string, make: () => THREE.Material): THREE.Material {
  let m = mats.get(key);
  if (!m) {
    m = make();
    markShared(m);
    mats.set(key, m);
  }
  return m;
}
const texMat = (t: THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => mat('tex:' + t.uuid + JSON.stringify(extra), () => new THREE.MeshLambertMaterial({ map: t, ...extra }));
const colMat = (c: string, extra: THREE.MeshLambertMaterialParameters = {}) => mat('col:' + c + JSON.stringify(extra), () => new THREE.MeshLambertMaterial({ color: c, ...extra }));

// ----------------------------------------------------------------------------- geometry builder

type V3 = [number, number, number];

class Builder {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(m: THREE.Material, g: THREE.BufferGeometry): void {
    const ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    if (!ng.getAttribute('uv')) ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ng.getAttribute('position').count * 2), 2));
    const list = this.parts.get(m) || [];
    list.push(ng);
    this.parts.set(m, list);
  }

  /** Planar polygon (convex, listed counter-clockwise seen from outside) with UVs from its first edge. */
  face(m: THREE.Material, pts: V3[], tile: number | [number, number], uvOverride?: [number, number][]): void {
    const P = pts.map(p => new THREE.Vector3(...p));
    const ex = P[1].clone().sub(P[0]).normalize();
    const n = P[1].clone().sub(P[0]).cross(P[P.length - 1].clone().sub(P[0])).normalize();
    const ey = n.clone().cross(ex).normalize();
    const [tu, tv] = Array.isArray(tile) ? tile : [tile, tile];
    const uvs = uvOverride || P.map(p => {
      const d = p.clone().sub(P[0]);
      return [d.dot(ex) / tu, d.dot(ey) / tv] as [number, number];
    });
    const pos: number[] = [];
    const nor: number[] = [];
    const uv: number[] = [];
    for (let i = 1; i < P.length - 1; i++) {
      for (const k of [0, i, i + 1]) {
        pos.push(P[k].x, P[k].y, P[k].z);
        nor.push(n.x, n.y, n.z);
        uv.push(uvs[k][0], uvs[k][1]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    this.add(m, g);
  }

  /** Axis-aligned box with world-scaled tiling UVs on every face. */
  box(m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 32, top = true): void {
    this.face(m, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], tile);
    this.face(m, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], tile);
    this.face(m, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], tile);
    this.face(m, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], tile);
    if (top) this.face(m, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], tile);
  }

  /** Four walls whose texture repeats a whole number of bays across and one storey up. */
  walls(m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, bay: number, storeys: number): void {
    const w = x1 - x0;
    const d = z1 - z0;
    const bx = Math.max(1, Math.round(w / bay));
    const bz = Math.max(1, Math.round(d / bay));
    const uv = (u: number): [number, number][] => [[0, 0], [u, 0], [u, storeys], [0, storeys]];
    this.face(m, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 1, uv(bx));
    this.face(m, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], 1, uv(bx));
    this.face(m, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 1, uv(bz));
    this.face(m, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], 1, uv(bz));
  }

  cylinder(m: THREE.Material, x: number, y: number, z: number, r0: number, r1: number, h: number, seg = 12): void {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg);
    g.translate(x, y + h / 2, z);
    this.add(m, g);
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    for (const [m, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      list.forEach(g => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

// ----------------------------------------------------------------------------- roofs

function hipRoof(B: Builder, m: THREE.Material, x0: number, z0: number, x1: number, z1: number, y0: number, rise: number, tile = 30): number {
  const w = x1 - x0;
  const d = z1 - z0;
  const top = y0 + rise;
  const xc = (x0 + x1) / 2;
  const zc = (z0 + z1) / 2;
  if (w >= d) {
    const r = d / 2;
    const R1: V3 = [x0 + r, top, zc];
    const R2: V3 = [x1 - r, top, zc];
    B.face(m, [[x0, y0, z1], [x1, y0, z1], R2, R1], tile);
    B.face(m, [[x1, y0, z0], [x0, y0, z0], R1, R2], tile);
    B.face(m, [[x0, y0, z0], [x0, y0, z1], R1], tile);
    B.face(m, [[x1, y0, z1], [x1, y0, z0], R2], tile);
  } else {
    const r = w / 2;
    const R1: V3 = [xc, top, z1 - r];
    const R2: V3 = [xc, top, z0 + r];
    B.face(m, [[x0, y0, z1], [x1, y0, z1], R1], tile);
    B.face(m, [[x1, y0, z0], [x0, y0, z0], R2], tile);
    B.face(m, [[x0, y0, z0], [x0, y0, z1], R1, R2], tile);
    B.face(m, [[x1, y0, z1], [x1, y0, z0], R2, R1], tile);
  }
  // Underside (visible beneath the eaves)
  B.face(m, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], tile);
  return top;
}

function gableRoof(B: Builder, m: THREE.Material, gableMat: THREE.Material, x0: number, z0: number, x1: number, z1: number, y0: number, rise: number, ov: number): number {
  const zc = (z0 + z1) / 2;
  const half = (z1 - z0) / 2;
  const top = y0 + rise;
  const drop = (ov * rise) / half;
  const X0 = x0 - ov;
  const X1 = x1 + ov;
  B.face(m, [[X0, y0 - drop, z1 + ov], [X1, y0 - drop, z1 + ov], [X1, top, zc], [X0, top, zc]], 30);
  B.face(m, [[X1, y0 - drop, z0 - ov], [X0, y0 - drop, z0 - ov], [X0, top, zc], [X1, top, zc]], 30);
  // Undersides of the eaves
  B.face(m, [[X1, y0 - drop, z1 + ov], [X0, y0 - drop, z1 + ov], [X0, top, zc], [X1, top, zc]], 30);
  B.face(m, [[X0, y0 - drop, z0 - ov], [X1, y0 - drop, z0 - ov], [X1, top, zc], [X0, top, zc]], 30);
  // Gable end walls
  B.face(gableMat, [[x0, y0, z0], [x0, y0, z1], [x0, top, zc]], 32);
  B.face(gableMat, [[x1, y0, z1], [x1, y0, z0], [x1, top, zc]], 32);
  return top;
}

// ----------------------------------------------------------------------------- assembly

/** Build a styled building over a 2.5D footprint (front edge b.y + b.h faces the street). */
export function buildArchitecture(b: RouteBuilding, styleKey: string): THREE.Group | null {
  const base = ARCH_STYLES[styleKey];
  if (!base) return null;
  const S: ArchSpec = { ...base };
  // The building's own palette from the 2.5D data, when it has one
  const B = new Builder();
  const bay = S.bay || 36;
  const front = b.y + b.h;
  const porticoDepth = S.portico ? 26 : 0;
  const x0 = b.x + 4;
  const x1 = b.x + b.w - 4;
  const z1 = front - 4 - porticoDepth;
  const z0 = Math.max(b.y, front - b.h * 0.95);
  const w = x1 - x0;
  const xc = (x0 + x1) / 2;

  const facade: FacadeOpts = { kind: S.wall, color: S.color, trim: S.trim, arch: S.arch, shutters: S.shutters, boxes: S.boxes, timberFrame: S.timberFrame };
  const groundOpts = { ...facade, kind: S.groundWall || S.wall, color: S.groundColor || S.color, mode: S.ground, shutters: S.ground === 'plain' ? S.shutters : undefined };
  const upperMat = texMat(upperBayTexture(facade));
  const groundMat = texMat(groundBayTexture(groundOpts));
  const trimMat = texMat(surfaceTexture('stone', S.trim));
  const plinthMat = texMat(surfaceTexture('stone', '#bdb3a2'));
  const plainWall = texMat(surfaceTexture(S.wall === 'glass' ? 'stone' : S.wall, S.wall === 'glass' ? S.trim : S.color));
  const roofMat = texMat(roofTexture(S.roofKind), { side: THREE.DoubleSide });

  // Plinth
  B.box(plinthMat, x0 - 2, 0, z0 - 2, x1 + 2, 4, z1 + 2, 24);

  // Storeys
  let y = 4;
  if (S.roof === 'vault') {
    const glass = texMat(conservatoryGlassTexture(), { transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    B.walls(glass, x0, y, z0, x1, y + S.floorH, z1, 28, 2);
    // White frame posts
    const frame = colMat('#f8fafc');
    for (let x = x0; x <= x1 + 0.1; x += w / Math.round(w / 28)) {
      B.box(frame, x - 1.2, y, z1 - 1.2, x + 1.2, y + S.floorH, z1 + 1.2, 8);
      B.box(frame, x - 1.2, y, z0 - 1.2, x + 1.2, y + S.floorH, z0 + 1.2, 8);
    }
    y += S.floorH;
    B.box(frame, x0 - 2, y - 2, z0 - 2, x1 + 2, y + 2, z1 + 2, 16);
    // Barrel vault along the long axis
    const r = (z1 - z0) / 2;
    const v = new THREE.CylinderGeometry(r, r, w, 20, 1, true, 0, Math.PI);
    v.rotateZ(Math.PI / 2);
    v.rotateX(-Math.PI / 2);
    v.translate(xc, y, (z0 + z1) / 2);
    const uv = v.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * Math.round(w / 28));
    B.add(glass, v);
    for (let x = x0; x <= x1 + 0.1; x += w / 4) {
      const rib = new THREE.TorusGeometry(r, 1.2, 4, 20, Math.PI);
      rib.rotateY(Math.PI / 2);
      rib.translate(x, y, (z0 + z1) / 2);
      B.add(frame, rib);
    }
    // Lantern on the ridge
    B.box(frame, xc - 14, y + r - 2, (z0 + z1) / 2 - 8, xc + 14, y + r + 8, (z0 + z1) / 2 + 8, 8);
    hipRoof(B, texMat(roofTexture('copper'), { side: THREE.DoubleSide }), xc - 16, (z0 + z1) / 2 - 10, xc + 16, (z0 + z1) / 2 + 10, y + r + 8, 8, 16);
  } else {
    const gH = S.floorH + (S.ground === 'arcade' ? 6 : 0);
    B.walls(groundMat, x0, y, z0, x1, y + gH, z1, bay, 1);
    y += gH;
    // String course between ground and upper floors
    B.box(trimMat, x0 - 2.5, y - 1, z0 - 2.5, x1 + 2.5, y + 2.5, z1 + 2.5, 24);
    const upper = S.floors - 1;
    if (upper > 0) {
      B.walls(upperMat, x0, y, z0, x1, y + upper * S.floorH, z1, bay, upper);
      // Balconies on the first upper floor
      if (S.balcony) {
        const rail = colMat(S.trim);
        for (let f = 0; f < Math.min(upper, S.floors >= 5 ? upper - 1 : 1); f++) {
          const by = y + f * S.floorH;
          const bays = Math.max(1, Math.round(w / bay));
          for (let k = 0; k < bays; k++) {
            if (bays > 2 && k % 2 === 1 && S.floors < 5) continue;
            const bx0 = x0 + (k + 0.18) * (w / bays);
            const bx1 = x0 + (k + 0.82) * (w / bays);
            B.box(trimMat, bx0, by, z1, bx1, by + 2.2, z1 + 7, 16);
            for (let px = bx0; px <= bx1 + 0.01; px += (bx1 - bx0) / 6) B.box(rail, px - 0.5, by + 2.2, z1 + 6, px + 0.5, by + 9, z1 + 7, 8, false);
            B.box(rail, bx0, by + 9, z1 + 5.6, bx1, by + 10.2, z1 + 7.2, 8);
          }
        }
      }
      y += upper * S.floorH;
    }
    // Cornice
    B.box(trimMat, x0 - 3.5, y - 1.5, z0 - 3.5, x1 + 3.5, y + 3.5, z1 + 3.5, 24);
    y += 3.5;
  }

  // Ground-floor details
  const doorW = Math.min(34, w * 0.3);
  const doorH = Math.min(S.floorH * 0.95, 34);
  if (S.door) {
    const dm = texMat(doorTexture(S.door, S.trim === '#ffffff' || S.trim === '#fffaf0' ? '#d6cfc2' : S.trim, !!S.arch), { transparent: true, alphaTest: 0.5 });
    B.face(dm, [[xc - doorW / 2, 4, z1 + 0.6], [xc + doorW / 2, 4, z1 + 0.6], [xc + doorW / 2, 4 + doorH, z1 + 0.6], [xc - doorW / 2, 4 + doorH, z1 + 0.6]], 1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (!S.portico && !S.awning) {
      B.box(trimMat, xc - doorW / 2 - 5, 4 + doorH + 1, z1, xc + doorW / 2 + 5, 4 + doorH + 4, z1 + 10, 16);
    }
    // Steps
    B.box(plinthMat, xc - doorW / 2 - 4, 0, z1, xc + doorW / 2 + 4, 2.5, z1 + 6 + porticoDepth * 0.2, 16);
  }
  if (S.awning) {
    const aw = texMat(awningTexture(S.awning[0], S.awning[1]), { side: THREE.DoubleSide });
    const ay = 4 + S.floorH * 0.86;
    B.face(aw, [[x0 + 2, ay - 9, z1 + 16], [x1 - 2, ay - 9, z1 + 16], [x1 - 2, ay, z1 + 0.5], [x0 + 2, ay, z1 + 0.5]], [16, 18]);
    B.face(aw, [[x0 + 2, ay - 14, z1 + 16], [x1 - 2, ay - 14, z1 + 16], [x1 - 2, ay - 9, z1 + 16], [x0 + 2, ay - 9, z1 + 16]], [16, 18]);
  }
  if (S.lanterns) {
    const lamp = colMat('#dc2626', { emissive: '#7f1d1d' });
    for (const lx of [x0 + 10, x1 - 10, xc - doorW, xc + doorW]) {
      B.box(lamp, lx - 3, S.floorH * 0.7, z1 + 9, lx + 3, S.floorH * 0.7 + 8, z1 + 15, 8);
    }
  }

  // Portico: columns, entablature and pediment in front of the main door
  if (S.portico) {
    const n = S.portico;
    const pw = Math.min(w * 0.7, n * 26);
    const px0 = xc - pw / 2;
    const px1 = xc + pw / 2;
    const pz1 = front - 3;
    const colH = Math.min(S.floorH * Math.min(2, S.floors), 64);
    const colMatl = texMat(surfaceTexture('stone', '#f4efe4'));
    B.box(plinthMat, px0 - 6, 0, z1, px1 + 6, 4, pz1 + 2, 20);
    B.box(plinthMat, px0 - 3, 4, z1, px1 + 3, 6, pz1 - 2, 20);
    for (let i = 0; i < n; i++) {
      const cx = px0 + (pw * i) / (n - 1);
      B.cylinder(colMatl, cx, 6, pz1 - 8, 4.2, 3.6, colH, 14);
      B.box(trimMat, cx - 5.5, 6, pz1 - 13.5, cx + 5.5, 8, pz1 - 2.5, 8);
      B.box(trimMat, cx - 5.5, 6 + colH - 2, pz1 - 13.5, cx + 5.5, 6 + colH, pz1 - 2.5, 8);
    }
    const ey = 6 + colH;
    B.box(trimMat, px0 - 8, ey, z1 - 2, px1 + 8, ey + 8, pz1, 20);
    const pedH = pw * 0.16;
    const pm = texMat(surfaceTexture('stone', S.trim));
    B.face(pm, [[px0 - 8, ey + 8, pz1], [px1 + 8, ey + 8, pz1], [xc, ey + 8 + pedH, pz1]], 24);
    B.face(roofMat, [[px1 + 10, ey + 8, pz1 + 2], [px1 + 10, ey + 8, z1 - 2], [xc, ey + 8 + pedH, z1 - 2], [xc, ey + 8 + pedH, pz1 + 2]], 24);
    B.face(roofMat, [[px0 - 10, ey + 8, z1 - 2], [px0 - 10, ey + 8, pz1 + 2], [xc, ey + 8 + pedH, pz1 + 2], [xc, ey + 8 + pedH, z1 - 2]], 24);
  }

  // Roof
  const depth = z1 - z0;
  let roofTop = y;
  if (S.roof === 'hip') {
    const ov = S.overhang ?? 5;
    const rise = depth * (S.pitch ?? 0.3);
    if (S.doubleRoof) {
      // Pagoda-style: a deep lower skirt roof, then the main roof above a short clerestory
      hipRoof(B, roofMat, x0 - ov, z0 - ov, x1 + ov, z1 + ov, y - 2, rise * 0.35);
      const inset = ov * 0.6 + 6;
      B.walls(plainWall, x0 + inset, y + rise * 0.3, z0 + inset, x1 - inset, y + rise * 0.3 + 12, z1 - inset, bay, 1);
      roofTop = hipRoof(B, roofMat, x0 + inset - ov, z0 + inset - ov, x1 - inset + ov, z1 - inset + ov, y + rise * 0.3 + 12, rise * 0.7);
    } else {
      roofTop = hipRoof(B, roofMat, x0 - ov, z0 - ov, x1 + ov, z1 + ov, y - 1, rise);
    }
  } else if (S.roof === 'gable') {
    roofTop = gableRoof(B, roofMat, plainWall, x0, z0, x1, z1, y - 1, depth * (S.pitch ?? 0.45), S.overhang ?? 6);
  } else if (S.roof === 'flat') {
    B.face(roofMat, [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], 40);
    // Parapet / balustrade
    const pm = trimMat;
    B.box(pm, x0 - 2, y, z1 - 2, x1 + 2, y + 8, z1 + 2, 16);
    B.box(pm, x0 - 2, y, z0 - 2, x1 + 2, y + 8, z0 + 2, 16);
    B.box(pm, x0 - 2, y, z0, x0 + 2, y + 8, z1, 16);
    B.box(pm, x1 - 2, y, z0, x1 + 2, y + 8, z1, 16);
    // Rooftop plant
    const metal = colMat('#94a3b8');
    B.box(metal, x0 + w * 0.15, y, z0 + depth * 0.3, x0 + w * 0.15 + 22, y + 12, z0 + depth * 0.3 + 16, 16);
    B.box(metal, x1 - w * 0.25, y, z0 + depth * 0.4, x1 - w * 0.25 + 30, y + 9, z0 + depth * 0.4 + 14, 16);
    roofTop = y + 8;
  }

  // Chimneys
  const brick = texMat(surfaceTexture('brick', '#8f4a37'));
  for (let i = 0; i < (S.chimneys || 0); i++) {
    const cx = x0 + w * (0.22 + (0.56 * i) / Math.max(1, (S.chimneys || 1) - 1 || 1));
    const cz = z0 + depth * 0.38;
    B.box(brick, cx - 5, y, cz - 5, cx + 5, roofTop + 8, cz + 5, 16);
    B.box(trimMat, cx - 6.5, roofTop + 8, cz - 6.5, cx + 6.5, roofTop + 10.5, cz + 6.5, 16);
  }

  // Dome over the centre
  if (S.dome) {
    const r = Math.min(w, depth) * 0.22;
    const dz = (z0 + z1) / 2;
    const drum = texMat(upperBayTexture({ ...facade, kind: 'stone', shutters: undefined, boxes: false, arch: true }));
    const dg = new THREE.CylinderGeometry(r, r, r * 0.6, 20, 1, true);
    dg.translate(xc, roofTop - 4 + r * 0.3, dz);
    const duv = dg.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < duv.count; i++) duv.setXY(i, duv.getX(i) * 8, duv.getY(i));
    B.add(drum, dg);
    B.cylinder(trimMat, xc, roofTop - 4 + r * 0.6, dz, r + 2, r + 2, 3, 20);
    const sg = new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    sg.translate(xc, roofTop - 1 + r * 0.6, dz);
    B.add(texMat(roofTexture(S.dome), { side: THREE.DoubleSide }), sg);
    B.cylinder(trimMat, xc, roofTop - 1 + r * 1.6, dz, 2.5, 1.5, 10, 8);
    roofTop = Math.max(roofTop, roofTop - 1 + r * 1.6 + 10);
  }

  // Clock / bell tower rising from the front of the roof
  if (S.tower || S.cupola) {
    const tw = S.tower ? Math.min(40, w * 0.2) : 18;
    const th = S.tower ? 44 : 14;
    const tz = z1 - (S.tower ? tw * 0.8 : depth * 0.5);
    const ty = S.tower ? y - 2 : roofTop - 6;
    const twMat = S.tower ? texMat(surfaceTexture(S.wall === 'glass' ? 'stone' : S.wall, S.color)) : colMat('#f8fafc');
    B.box(twMat, xc - tw / 2, ty, tz - tw / 2, xc + tw / 2, ty + th, tz + tw / 2, 24);
    if (S.tower) {
      // Clock faces
      const clock = colMat('#fdf6e3', { emissive: '#3a2f10' });
      const ring = colMat('#1f2937');
      for (const [fx, fz, nx, nz] of [[0, 1, 0, 1], [0, -1, 0, -1]] as const) {
        const cg = new THREE.CircleGeometry(tw * 0.32, 20);
        if (nz < 0) cg.rotateY(Math.PI);
        cg.translate(xc + fx, ty + th * 0.62, tz + fz * (tw / 2 + 0.4) + nx);
        B.add(clock, cg);
        const rg = new THREE.RingGeometry(tw * 0.32, tw * 0.37, 20);
        if (nz < 0) rg.rotateY(Math.PI);
        rg.translate(xc, ty + th * 0.62, tz + fz * (tw / 2 + 0.5));
        B.add(ring, rg);
      }
    } else {
      const open = colMat('#1f2937');
      B.box(open, xc - tw / 2 + 3, ty + 4, tz + tw / 2, xc + tw / 2 - 3, ty + th - 2, tz + tw / 2 + 0.4, 8, false);
    }
    B.box(trimMat, xc - tw / 2 - 2, ty + th, tz - tw / 2 - 2, xc + tw / 2 + 2, ty + th + 3, tz + tw / 2 + 2, 16);
    const spire = hipRoof(B, texMat(roofTexture(S.tower ? 'copper' : S.roofKind), { side: THREE.DoubleSide }), xc - tw / 2 - 2, tz - tw / 2 - 2, xc + tw / 2 + 2, tz + tw / 2 + 2, ty + th + 3, tw * 0.9, 16);
    B.cylinder(colMat('#d4a017'), xc, spire, tz, 1, 0.4, 8, 6);
    roofTop = Math.max(roofTop, spire + 8);
  }

  // Flags on poles at the front corners of the roof
  if (S.flags) {
    const pole = colMat('#e5e7eb');
    const cloth = colMat(S.flags, { side: THREE.DoubleSide });
    for (const fx of [x0 + 8, x1 - 8]) {
      const fy = S.roof === 'flat' ? y : y + 2;
      B.cylinder(pole, fx, fy, z1 - 6, 0.9, 0.7, 34, 6);
      B.face(cloth, [[fx, fy + 22, z1 - 6], [fx + 18, fy + 23, z1 - 6], [fx + 18, fy + 33, z1 - 6], [fx, fy + 34, z1 - 6]], 20);
    }
  }

  return B.build();
}
