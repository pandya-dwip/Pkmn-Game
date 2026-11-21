/**
 * ThirdPersonCamera.ts
 * Shared chase camera for every location: trails behind and above the
 * trainer, eases into turns, and pulls the boom in when something solid
 * (building, cave rock, cliff, large rock formation) would come between the
 * lens and the trainer, then lets it out again slowly so it never pumps.
 *
 * Behaviour is identical everywhere; only the boom length / height / aim come
 * from the location's CameraConfig (open routes sit wider, caves and forests
 * closer). Portrait screens get a longer, higher boom for a wider view.
 */

import * as THREE from 'three';
import type { CameraConfig } from './LocationEnvironment';

const MIN_CAMERA_Y = 10;

export class ThirdPersonCamera {
  public readonly camera = new THREE.PerspectiveCamera(58, 1, 8, 2600);
  /** Smoothed camera heading (radians). */
  public yaw = 0;
  /** Current (possibly shortened) boom length. */
  public dist = 110;
  /** Portrait multiplier for the boom. */
  public boom = 1;
  private cfg: CameraConfig = { dist: 110, height: 62, lookAhead: 50, lookHeight: 14, minDist: 36 };
  private target = new THREE.Vector3();

  public configure(cfg: CameraConfig): void {
    this.cfg = cfg;
  }

  public get config(): CameraConfig {
    return this.cfg;
  }

  /** Full (unobstructed) boom length. */
  public get fullDist(): number {
    return this.cfg.dist * this.boom;
  }

  /** Fit the projection to the viewport (portrait phones see more of the world). */
  public resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 74 : 58;
    this.boom = w < h ? Math.min(1.7, 0.75 + 0.5 * (h / w)) : 1;
    this.camera.updateProjectionMatrix();
  }

  /** Jump straight behind the trainer (location entry / respawn). */
  public snap(px: number, pz: number, heading: number, blocked?: (x: number, z: number) => boolean): void {
    this.yaw = heading;
    this.dist = this.fullDist;
    this.update(px, pz, heading, 1, 1, blocked, 1);
  }

  /**
   * Follow the trainer at (px, pz) facing `heading`.
   * yawK / posK are per-frame smoothing factors (0..1); `blocked` reports solid ground cells.
   */
  public update(px: number, pz: number, heading: number, yawK: number, posK: number, blocked?: (x: number, z: number) => boolean, pullK = 0.5): void {
    let d = heading - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * yawK;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const full = this.fullDist;
    const ax = px;
    const az = pz + 6;

    // Shorten the boom if something solid sits between camera and trainer
    let want = full;
    if (blocked) {
      for (let t = 0.2; t <= 1.0001; t += 0.05) {
        if (blocked(ax - fx * full * t, az - fz * full * t)) {
          want = Math.max(this.cfg.minDist, full * (t - 0.12));
          break;
        }
      }
    }
    // Pull in quickly (never show a wall's inside), let out gently (no pumping)
    this.dist += (want - this.dist) * (want < this.dist ? pullK : posK);
    const k = this.dist / full;
    const y = Math.max(MIN_CAMERA_Y, this.cfg.height * this.boom * (0.45 + 0.55 * k));
    this.target.set(ax - fx * this.dist, y, az - fz * this.dist);
    this.camera.position.lerp(this.target, posK);
    if (this.camera.position.y < MIN_CAMERA_Y) this.camera.position.y = MIN_CAMERA_Y;
    this.camera.lookAt(ax + fx * this.cfg.lookAhead, this.cfg.lookHeight, az + fz * this.cfg.lookAhead);
  }
}
