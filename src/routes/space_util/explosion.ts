// src/space_util/explosion.ts
import * as THREE from "three";
import { au } from "./kepler";

export type SimpleExplosionOptions = {
  durationSec?: number;   // duración total (seg)
  maxRadiusAU?: number;   // radio final en UA
  color?: number;         // color esfera
  startRadiusAU?: number; // radio inicial (UA)
  alwaysOnTop?: boolean;  // dibujar encima de todo (sin depth test)
};

export class SimpleExplosion {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private ageSec = 0;
  private durationSec = 1.0;
  private startRadiusAU = 0.0;
  private maxRadiusAU = 0.12;
  private alive = false;
  private alwaysOnTop = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public isActive() {
    return this.alive;
  }

  public clear() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (this.material) this.material.dispose();
      this.mesh = null;
      this.material = null;
    }
    this.alive = false;
    this.ageSec = 0;
  }

  public spawn(position: THREE.Vector3, opts: SimpleExplosionOptions = {}) {
    this.clear();

    this.durationSec   = opts.durationSec   ?? 1.0;
    this.maxRadiusAU   = opts.maxRadiusAU   ?? 0.12;
    this.startRadiusAU = opts.startRadiusAU ?? 0.0;
    this.alwaysOnTop   = opts.alwaysOnTop   ?? true;

    const color = opts.color ?? 0xffee66;

    // Geometría unitaria; escalamos con au(radius)
    const geo = new THREE.SphereGeometry(1, 24, 16);
    this.material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: !this.alwaysOnTop ? true : false, // clave: que no la tape la Tierra
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.copy(position);

    if (this.alwaysOnTop) this.mesh.renderOrder = 9999;

    this.mesh.scale.setScalar(au(this.startRadiusAU));
    this.scene.add(this.mesh);

    this.ageSec = 0;
    this.alive = true;
  }

  /** dtSec = tiempo REAL del frame (en segundos). */
  public update(dtSec: number) {
    if (!this.alive || !this.mesh || !this.material) return;

    this.ageSec += dtSec;
    const t = Math.min(1, this.ageSec / this.durationSec);

    // ease-out
    const ease = 1 - Math.pow(1 - t, 2);
    const radiusAU = this.startRadiusAU + (this.maxRadiusAU - this.startRadiusAU) * ease;

    this.mesh.scale.setScalar(au(radiusAU));
    this.material.opacity = 1 - t;

    if (t >= 1 || this.material.opacity <= 0.02) {
      this.clear();
    }
  }
}
