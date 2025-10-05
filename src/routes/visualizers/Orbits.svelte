<script lang="ts">
  import { onMount, tick } from "svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { makeLabel, makeLabelRenderer } from "../space_util/ui";
  import { elementsToPosition, au } from "../space_util/kepler";
  import { buildStars } from "../space_util/stars";
  import { TimeController } from "../space_util/time";
  import type { Controls } from "../controls";
  import type { Writable } from "svelte/store";
  import { SimpleExplosion } from "../space_util/explosion";

  export let controls: Writable<Controls>;
  let container: HTMLDivElement;

  const bodies = [
    { name: "Mercury", color: 0xc6b18b, a: 0.387098, e: 0.20563, i: 7.0049, O: 48.331, w: 29.124, P: 87.969 },
    { name: "Venus",   color: 0xd9c08f, a: 0.723332, e: 0.006772, i: 3.3946, O: 76.68,  w: 54.884, P: 224.701 },
    { name: "Earth",   color: 0x88aaff, a: 1.0,      e: 0.01671,  i: 0.0,   O: -11.26, w: 102.947, P: 365.256 },
    { name: "Mars",    color: 0xff6f4f, a: 1.523679, e: 0.0934,   i: 1.85,  O: 49.558, w: 286.502, P: 686.98 },
    { name: "Jupiter", color: 0xffd29b, a: 5.204267, e: 0.048775, i: 1.303, O: 100.464,w: 273.867, P: 4332.589 },
    { name: "Saturn",  color: 0xf2e3b6, a: 9.582017, e: 0.055723, i: 2.485, O: 113.665,w: 339.392, P: 10759.22 },
    { name: "Uranus",  color: 0xa0d8ff, a: 19.18916, e: 0.04722,  i: 0.773, O: 74.006, w: 96.998,  P: 30685.4 },
    { name: "Neptune", color: 0x6fb6ff, a: 30.06992, e: 0.00859,  i: 1.77,  O: 131.784,w: 276.336, P: 60190 },
  ];

  let planetMeshes: Record<string, THREE.Mesh> = {};
  let planetLabels: Record<string, THREE.Object3D> = {};
  let planetVisRadiusAU: Record<string, number> = {};
  let sun: THREE.Mesh;
  const time = new TimeController();

  type DynamicBody = {
    mesh: THREE.Mesh;
    mass: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3; // UA/día
  };
  let dynamicBodies: DynamicBody[] = [];
  let activeMeteor: DynamicBody | null = null;

  // FX del meteoro
  let meteorGlow: THREE.Sprite | null = null;
  let meteorLight: THREE.PointLight | null = null;
  let meteorTrail: THREE.Mesh | null = null;
  let trailPoints: THREE.Vector3[] = [];
  const TRAIL_MAX_POINTS = 600;
  const TRAIL_RADIUS = au(0.004);
  const METEOR_RADIUS_AU = 0.02;

  // Explosión simple
  let explosion: SimpleExplosion;

  // Edge detection para shooting
  let lastShooting = false;

  let scene: THREE.Scene;

  function buildSolarSystem(scene: THREE.Scene) {
    sun = new THREE.Mesh(
      new THREE.SphereGeometry(au(0.08), 32, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd27f }),
    );
    scene.add(sun);

    for (const p of bodies) {
      const radiusAU = Math.max(0.015, 0.003 + Math.log10(p.a + 1) * 0.01);
      planetVisRadiusAU[p.name] = radiusAU;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(au(radiusAU), 32, 16),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8, metalness: 0 }),
      );
      scene.add(mesh);
      planetMeshes[p.name] = mesh;

      const label = makeLabel(p.name);
      mesh.add(label);
      label.position.set(0, au(radiusAU * 2.2), 0);
      planetLabels[p.name] = label;

      const curvePts: THREE.Vector3[] = [];
      for (let M = 0; M <= 360; M += 2) {
        curvePts.push(elementsToPosition(p.a, p.e, p.i, p.O, p.w, M));
      }
      const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
      scene.add(new THREE.LineLoop(
        curveGeo,
        new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.35 })
      ));
    }
    setTimeDays(0);
  }

  function setTimeDays(days: number) {
    for (const p of bodies) {
      const n = 360 / p.P;
      const M = n * days;
      const pos = elementsToPosition(p.a, p.e, p.i, p.O, p.w, M);
      planetMeshes[p.name].position.copy(pos);
    }
  }

  function createGlowSprite(hexColor = 0xffcc44, size = au(0.16)): THREE.Sprite {
    const sizePx = 256;
    const canvas = document.createElement("canvas");
    canvas.width = sizePx; canvas.height = sizePx;
    const ctx = canvas.getContext("2d")!;
    const grd = ctx.createRadialGradient(sizePx/2, sizePx/2, 0, sizePx/2, sizePx/2, sizePx/2);
    const c = new THREE.Color(hexColor);
    grd.addColorStop(0.0, `rgba(${(c.r*255)|0}, ${(c.g*255)|0}, ${(c.b*255)|0}, 1)`);
    grd.addColorStop(0.25, `rgba(${(c.r*255)|0}, ${(c.g*255)|0}, ${(c.b*255)|0}, 0.5)`);
    grd.addColorStop(1.0, `rgba(${(c.r*255)|0}, ${(c.g*255)|0}, ${(c.b*255)|0}, 0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, sizePx, sizePx);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  export function calculateEarthStartForImpact(
    earthData: { a: number; e: number; i: number; O: number; w: number; P: number },
    currentDays: number,
    meteorStartPos: THREE.Vector3,
    meteorSpeed: number, // UA/día
  ): number {
    const n = 360 / earthData.P;
    let bestDays = currentDays;
    let minError = Infinity;
    const searchRange = earthData.P * 2;
    const steps = 1000;

    for (let i = 0; i < steps; i++) {
      const testDays = currentDays + (i / steps) * searchRange;
      const M_test = (n * testDays) % 360;
      const earthTestPos = elementsToPosition(earthData.a, earthData.e, earthData.i, earthData.O, earthData.w, M_test);
      const distToEarth = meteorStartPos.distanceTo(earthTestPos);
      const timeToReach = distToEarth / meteorSpeed;
      const error = Math.abs(timeToReach - (testDays - currentDays));
      if (error < minError) { minError = error; bestDays = testDays; }
    }
    const refineRange = searchRange / steps;
    for (let i = 0; i < 100; i++) {
      const testDays = bestDays - refineRange / 2 + (i / 100) * refineRange;
      const M_test = (n * testDays) % 360;
      const earthTestPos = elementsToPosition(earthData.a, earthData.e, earthData.i, earthData.O, earthData.w, M_test);
      const distToEarth = meteorStartPos.distanceTo(earthTestPos);
      const timeToReach = distToEarth / meteorSpeed;
      const error = Math.abs(timeToReach - (testDays - currentDays));
      if (error < minError) { minError = error; bestDays = testDays; }
    }
    return bestDays;
  }

  function spawnMeteorTowardEarth(scene: THREE.Scene) {
    if (activeMeteor) return; // protege: solo 1 meteoro activo

    const earthData = bodies.find((b) => b.name === "Earth");
    if (!earthData) return;

    const speedAUperDay = ($controls.velocity || 0.001) * ($controls.yearsPerSec || 1) * 365.25;
    const spawnDist = $controls.distance || 6;
    const meteorStart = new THREE.Vector3(0, 0, spawnDist);

    const impactDays = calculateEarthStartForImpact(earthData, time.days, meteorStart, speedAUperDay);
    const M_impact = (360 / earthData.P) * impactDays;
    const earthImpactPos = elementsToPosition(earthData.a, earthData.e, earthData.i, earthData.O, earthData.w, M_impact % 360);

    const direction = earthImpactPos.clone().sub(meteorStart).normalize();
    const velocity = direction.multiplyScalar(speedAUperDay);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(au(METEOR_RADIUS_AU), 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xff9c33, roughness: 0.2, metalness: 0.1, emissive: 0xff7700, emissiveIntensity: 2
      }),
    );
    mesh.position.copy(meteorStart);
    scene.add(mesh);

    activeMeteor = { mesh, mass: 1, position: meteorStart.clone(), velocity };
    dynamicBodies.push(activeMeteor);

    // halo + luz
    meteorGlow = createGlowSprite(0xffcc44, au(METEOR_RADIUS_AU * 8));
    meteorGlow.position.copy(mesh.position);
    scene.add(meteorGlow);

    meteorLight = new THREE.PointLight(0xffd9a0, 3, au(1.2), 2.0);
    meteorLight.position.copy(mesh.position);
    scene.add(meteorLight);

    // estela tubular
    trailPoints = [meteorStart.clone(), meteorStart.clone().add(direction.clone().multiplyScalar(au(0.001)))];
    const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trailPoints), 32, TRAIL_RADIUS, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffb65c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    meteorTrail = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(meteorTrail);
  }

  function cleanupMeteor() {
    if (!activeMeteor) return;
    scene.remove(activeMeteor.mesh);
    dynamicBodies = dynamicBodies.filter((b) => b !== activeMeteor);
    activeMeteor = null;

    if (meteorGlow) {
      scene.remove(meteorGlow);
      (meteorGlow.material as THREE.Material).dispose?.();
      (meteorGlow as any).material?.map?.dispose?.();
      meteorGlow = null;
    }
    if (meteorLight) {
      scene.remove(meteorLight);
      meteorLight = null;
    }
    if (meteorTrail) {
      scene.remove(meteorTrail);
      meteorTrail.geometry.dispose();
      (meteorTrail.material as THREE.Material).dispose();
      meteorTrail = null;
    }
    trailPoints = [];
  }

  function updateDynamicBodies(dtDays: number) {
    dynamicBodies.forEach((body) => {
      body.position.addScaledVector(body.velocity, dtDays);
      body.mesh.position.copy(body.position);
    });

    if (activeMeteor) {
      if (meteorGlow) meteorGlow.position.copy(activeMeteor.position);
      if (meteorLight) meteorLight.position.copy(activeMeteor.position);

      // actualizar estela
      trailPoints.push(activeMeteor.position.clone());
      if (trailPoints.length > TRAIL_MAX_POINTS) trailPoints.splice(0, trailPoints.length - TRAIL_MAX_POINTS);
      if (meteorTrail) {
        const curve = new THREE.CatmullRomCurve3(trailPoints);
        const newGeo = new THREE.TubeGeometry(curve, Math.max(16, trailPoints.length - 1), TRAIL_RADIUS, 8, false);
        meteorTrail.geometry.dispose();
        meteorTrail.geometry = newGeo;
      }

      // colisión con Tierra
      const earth = planetMeshes["Earth"];
      if (earth) {
        const dist = activeMeteor.position.distanceTo(earth.position);
        const hitDist = au(planetVisRadiusAU["Earth"] + METEOR_RADIUS_AU * 1.2);
        if (dist <= hitDist) {
          const impactPoint = activeMeteor.position.clone();

          // Explosión simple
          explosion.spawn(impactPoint, {
            durationSec: 1.0,
            maxRadiusAU: planetVisRadiusAU["Earth"] * 0.7,
            color: 0xffee66,
            startRadiusAU: 0.0,
          });

          cleanupMeteor();
          // Nota: dejamos que la explosión termine sola
        }

        // --- Rebasa la Tierra: si ya pasó, se borra ---
        if (activeMeteor) {
          const forward = activeMeteor.velocity.clone().normalize();
          const toEarth = earth.position.clone().sub(activeMeteor.position);
          if (toEarth.dot(forward) < -30) {
            // ya la dejó atrás
            cleanupMeteor();
          }
        }
      }
    }
  }

  onMount(async () => {
    await tick();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.01, 5e6);
    camera.position.set(0, 300, 500);

    const orbitControls = new OrbitControls(camera, container);
    orbitControls.enableDamping = true;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x111133, 0.25);
    scene.add(hemi);
    const sunLight = new THREE.PointLight(0xffffff, 3, 0, 2);
    scene.add(sunLight);

    buildStars(scene, 8000);
    buildSolarSystem(scene);
    if (sun) sunLight.position.copy(sun.position);

    const labelRenderer = makeLabelRenderer(container);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0";
    labelRenderer.domElement.style.left = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    labelRenderer.domElement.style.zIndex = "10";
    container.appendChild(labelRenderer.domElement);

    // instancia de explosión simple
    explosion = new SimpleExplosion(scene);

    let last = performance.now();
    function animate(now: number) {
      requestAnimationFrame(animate);

      const dtRealSec = (now - last) / 1000; // segundos reales
      const dtYears = ($controls.shooting ? $controls.yearsPerSec : 0) * dtRealSec;
      last = now;

      time.tick(dtYears);
      setTimeDays(time.days);

      const dtDays = dtYears * 365.25;
      updateDynamicBodies(dtDays);

      // actualizar explosión con segundos reales
      explosion.update(dtRealSec);

      orbitControls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    const handleResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      labelRenderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
  });

  // Solo 1 meteoro por press; limpieza total al soltar
  $: if ($controls && scene) {
    // flanco ↑: false -> true
    if ($controls.shooting && !lastShooting) {
      spawnMeteorTowardEarth(scene);
    }
    // flanco ↓: true -> false
    if (!$controls.shooting && lastShooting) {
      cleanupMeteor(); // borra meteoro + FX
      // la explosión (si existe) termina sola
    }
    lastShooting = !!$controls.shooting;
  }
</script>

<div id="orbits-container" bind:this={container} class="flex-1 w-full h-full"></div>

<style>
  #orbits-container {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    cursor: grab;
  }
  #orbits-container:active {
    cursor: grabbing;
  }
</style>
