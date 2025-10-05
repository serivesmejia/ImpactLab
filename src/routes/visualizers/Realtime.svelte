<script lang="ts">
    import { onMount, tick } from "svelte";
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
    import { makeLabel, makeLabelRenderer } from "../space_util/ui";
    import { au } from "../space_util/kepler";
    import { buildStars } from "../space_util/stars";
    import { TimeController } from "../space_util/time";
    import type { Controls } from "../controls";

    export let controls: Controls;

    let container: HTMLDivElement;

    // ---------- Accessibility state ----------
    type AccMode = "scientist" | "kid";
    let accMode: AccMode = "scientist";
    let accHighContrast = false;
    let ariaLiveMsg = "";

    // ---------- Rendering globals ----------
    let renderer: THREE.WebGLRenderer;
    let camera: THREE.PerspectiveCamera;
    let orbitControls: OrbitControls;
    let labelRenderer: any;
    let last = 0;

    // ---------- Planet styles ----------
    const planetStyles: Record<string, { color: number; radiusAU: number }> = {
        Mercury: { color: 0xc6b18b, radiusAU: 0.015 },
        Venus: { color: 0xd9c08f, radiusAU: 0.018 },
        Earth: { color: 0x88aaff, radiusAU: 0.02 },
        Mars: { color: 0xff6f4f, radiusAU: 0.018 },
        Jupiter: { color: 0xffd29b, radiusAU: 0.05 },
        Saturn: { color: 0xf2e3b6, radiusAU: 0.045 },
        Uranus: { color: 0xa0d8ff, radiusAU: 0.035 },
        Neptune: { color: 0x6fb6ff, radiusAU: 0.033 }
    };

    // ---------- JPL mean elements (approx) ----------
    type MeanEls = {
        a0: number; adot: number;
        e0: number; edot: number;
        i0: number; idotArcsec: number;
        Om0: number; OmdotArcsec: number;
        pi0: number; pidotArcsec: number;
        L0: number; LdotArcsec: number;
    };

    const JPL_MEAN: Record<string, MeanEls> = {
        Mercury:{a0:0.38709893, adot: 0.00000066, e0:0.20563069, edot: 0.00002527, i0:7.00487, idotArcsec:-23.51, Om0:48.33167, OmdotArcsec:-446.30, pi0:77.45645,  pidotArcsec: 573.57,  L0:252.25084, LdotArcsec: 538101628.29},
        Venus:  {a0:0.72333199, adot: 0.00000092, e0:0.00677323, edot:-0.00004938, i0:3.39471, idotArcsec: -2.86, Om0:76.68069, OmdotArcsec: -996.89, pi0:131.53298, pidotArcsec:-108.80,  L0:181.97973, LdotArcsec: 210664136.06},
        Earth:  {a0:1.00000011, adot:-0.00000005, e0:0.01671022, edot:-0.00003804, i0:0.00005, idotArcsec: -46.94, Om0:-11.26064,OmdotArcsec:-18228.25, pi0:102.94719, pidotArcsec:1198.28,  L0:100.46435, LdotArcsec: 129597740.63},
        Mars:   {a0:1.52366231, adot:-0.00007221, e0:0.09341233, edot: 0.00011902, i0:1.85061, idotArcsec: -25.47, Om0:49.57854, OmdotArcsec:-1020.19, pi0:336.04084, pidotArcsec:1560.78,  L0:355.45332, LdotArcsec: 68905103.78},
        Jupiter:{a0:5.20336301, adot: 0.00060737, e0:0.04839266, edot:-0.00012880, i0:1.30530, idotArcsec:  -4.15, Om0:100.55615,OmdotArcsec: 1217.17,  pi0:14.75385,  pidotArcsec: 839.93,   L0:34.40438,  LdotArcsec: 10925078.35},
        Saturn: {a0:9.53707032, adot:-0.00301530, e0:0.05415060, edot:-0.00036762, i0:2.48446, idotArcsec:   6.11, Om0:113.71504,OmdotArcsec:-1591.05, pi0:92.43194,  pidotArcsec:-1948.89,  L0:49.94432,  LdotArcsec: 4401052.95},
        Uranus: {a0:19.19126393,adot: 0.00152025, e0:0.04716771, edot:-0.00019150, i0:0.76986, idotArcsec:  -2.09, Om0:74.22988, OmdotArcsec:-1681.40, pi0:170.96424, pidotArcsec:1312.56,  L0:313.23218, LdotArcsec: 1542547.79},
        Neptune:{a0:30.06896348,adot:-0.00125196, e0:0.00858587, edot: 0.00002510, i0:1.76917, idotArcsec:  -3.64, Om0:131.72169,OmdotArcsec: -151.25,  pi0:44.97135,  pidotArcsec:-844.43,   L0:304.88003, LdotArcsec: 786449.21},
    };

    const PLANET_NAMES = Object.keys(JPL_MEAN);

    // ---------- Animation settings for NEOs ----------
    let ANIMATE_TRAJECTORIES = true;
    const TRAJ_HALF_WINDOW_MIN = 30;

    type AsteroidTraj = {
        line: THREE.Line;
        start: THREE.Vector3;
        end: THREE.Vector3;
        caMs: number;
        windowMs: number;
    };
    const trajById = new Map<string, AsteroidTraj>();
    let SHOW_ALL_TRAJECTORIES = true;

    // ---------- Scene state ----------
    let planetMeshes: Record<string, THREE.Mesh> = {};
    let planetLabels: Record<string, THREE.Object3D> = {};
    let asteroidTrajGroup: THREE.Group;
    let sun: THREE.Mesh;
    const time = new TimeController();

    // ---------- Optional dynamic bodies ----------
    type DynamicBody = {
        mesh: THREE.Mesh;
        mass: number;
        position: THREE.Vector3;
        velocity: THREE.Vector3;
    };
    let dynamicBodies: DynamicBody[] = [];

    // ---------- Time/angles ----------
    const JD_J2000 = 2451545.0;
    function julianDateUTC(d: Date): number {
        const Y = d.getUTCFullYear();
        let M = d.getUTCMonth() + 1;
        const dayFrac =
            (d.getUTCHours() + (d.getUTCMinutes() + (d.getUTCSeconds() + d.getUTCMilliseconds() / 1000) / 60) / 60) / 24;
        const D = d.getUTCDate() + dayFrac;

        const a = Math.floor((14 - M) / 12);
        const y = Y + 4800 - a;
        const m = M + 12 * a - 3;
        const JDN =
            Math.floor((153 * m + 2) / 5) +
            365 * y +
            Math.floor(y / 4) -
            Math.floor(y / 100) +
            Math.floor(y / 400) - 32045;

        return JDN + (D - Math.floor(D)) - 0.5;
    }
    function centuriesSinceJ2000(d: Date): number {
        return (julianDateUTC(d) - JD_J2000) / 36525.0;
    }
    function normDeg(x: number) { x %= 360; return x < 0 ? x + 360 : x; }
    function toRad(deg: number) { return (deg * Math.PI) / 180; }

    // ---------- Kepler + planet positions ----------
    function solveKepler(Mrad: number, e: number): number {
        let E = Mrad + (e < 0.8 ? e : Math.sign(Math.sin(Mrad)) * 0.85);
        for (let k = 0; k < 10; k++) {
            const f = E - e * Math.sin(E) - Mrad;
            const fp = 1 - e * Math.cos(E);
            E -= f / fp;
        }
        return E;
    }

    function planetPositionAU(name: string, date: Date): THREE.Vector3 {
        const p = JPL_MEAN[name];
        const T = centuriesSinceJ2000(date);

        const a  = p.a0 + p.adot * T;
        const e  = p.e0 + p.edot * T;
        const i  = p.i0 + (p.idotArcsec  / 3600) * T;
        const Om = p.Om0 + (p.OmdotArcsec / 3600) * T;
        const pi = p.pi0 + (p.pidotArcsec / 3600) * T;
        const L  = p.L0  + (p.LdotArcsec  / 3600) * T;

        const M = normDeg(L - pi);
        const w = normDeg(pi - Om);

        const Mrad = toRad(M);
        const E = solveKepler(Mrad, e);
        const cosE = Math.cos(E), sinE = Math.sin(E);
        const r = a * (1 - e * cosE);

        const nu = Math.atan2(Math.sqrt(1 - e * e) * sinE, (cosE - e));
        const x_orb = r * Math.cos(nu);
        const y_orb = r * Math.sin(nu);

        const cw = Math.cos(toRad(w)),  sw = Math.sin(toRad(w));
        const cO = Math.cos(toRad(Om)), sO = Math.sin(toRad(Om));
        const ci = Math.cos(toRad(i)),  si = Math.sin(toRad(i));

        const x1 = cw * x_orb - sw * y_orb;
        const y1 = sw * x_orb + cw * y_orb;

        const x2 = x1;
        const y2 = y1 * ci;
        const z2 = y1 * si;

        const x =  cO * x2 - sO * y2;
        const y =  sO * x2 + cO * y2;
        const z =  z2;

        return new THREE.Vector3(au(x), au(y), au(z));
    }

    function buildOrbitCurveFor(planetName: string, date: Date, color: number): THREE.LineLoop {
        const p = JPL_MEAN[planetName];
        const T = centuriesSinceJ2000(date);
        const a  = p.a0 + p.adot * T;
        const e  = p.e0 + p.edot * T;
        const i  = p.i0 + (p.idotArcsec/3600) * T;
        const Om = p.Om0 + (p.OmdotArcsec/3600) * T;
        const w  = (p.pi0 + (p.pidotArcsec/3600) * T) - Om;

        const pts: THREE.Vector3[] = [];
        for (let nuDeg = 0; nuDeg <= 360; nuDeg += 2) {
            const nu = toRad(nuDeg);
            const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
            const cw = Math.cos(toRad(w)),  sw = Math.sin(toRad(w));
            const cO = Math.cos(toRad(Om)), sO = Math.sin(toRad(Om));
            const ci = Math.cos(toRad(i)),  si = Math.sin(toRad(i));
            const x_orb = r * Math.cos(nu), y_orb = r * Math.sin(nu);

            const x1 = cw * x_orb - sw * y_orb;
            const y1 = sw * x_orb + cw * y_orb;
            const x2 = x1, y2 = y1 * ci, z2 = y1 * si;
            const x = cO * x2 - sO * y2, y = sO * x2 + cO * y2, z = z2;

            pts.push(new THREE.Vector3(au(x), au(y), au(z)));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }));
    }

    // ---------- Solar system ----------
    function buildSolarSystem(scene: THREE.Scene) {
        // Sun
        sun = new THREE.Mesh(
            new THREE.SphereGeometry(au(0.08), 32, 16),
            new THREE.MeshBasicMaterial({ color: 0xffd27f })
        );
        scene.add(sun);

        const now = new Date();

        // Planets
        PLANET_NAMES.forEach((name) => {
            const style = planetStyles[name] ?? { color: 0xffffff, radiusAU: 0.015 };
            const m = new THREE.Mesh(
                new THREE.SphereGeometry(au(style.radiusAU), 32, 16),
                new THREE.MeshStandardMaterial({ color: style.color, roughness: 0.8, metalness: 0 })
            );
            scene.add(m);
            planetMeshes[name] = m;

            const label = makeLabel(name);
            m.add(label);
            label.position.set(0, au(style.radiusAU * 2.2), 0);
            planetLabels[name] = label;

            const orbit = buildOrbitCurveFor(name, now, style.color);
            scene.add(orbit);
        });

        setTimeDays(0);
    }

    function simDateFromOffsetDays(offsetDays: number): Date {
        const now = new Date();
        return new Date(now.getTime() + offsetDays * 86400_000);
    }

    function setTimeDays(daysOffset: number) {
        const d = simDateFromOffsetDays(daysOffset);
        PLANET_NAMES.forEach((name) => {
            const pos = planetPositionAU(name, d);
            planetMeshes[name].position.copy(pos);
        });
    }

    // ---------- Optional manual meteoroids ----------
    function addMeteor(
        scene: THREE.Scene,
        params: {
            position: [number, number, number];
            velocity: [number, number, number];
            mass: number;
            radius?: number;
            color?: number;
            info?: Record<string, any>;
        },
    ) {
        const {
            position, velocity, mass,
            radius = 0.002, color = 0xff6600, info = {},
        } = params;

        const material = new THREE.MeshStandardMaterial({
            color, roughness: 0.5, metalness: 0.2, transparent: true, opacity: 0.5,
            emissive: new THREE.Color(color), emissiveIntensity: 0.25,
        });

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(au(radius), 16, 8), material);
        mesh.position.set(...position);
        (mesh as any).userData = { info };
        scene.add(mesh);

        dynamicBodies.push({
            mesh, mass,
            position: new THREE.Vector3(...position),
            velocity: new THREE.Vector3(...velocity),
        });

        return mesh;
    }

    function updateDynamicBodies(dt: number) {
        dynamicBodies.forEach((body) => {
            body.position.addScaledVector(body.velocity, dt);
            body.mesh.position.copy(body.position);
        });
    }

    // ============================
    //     ASTEROIDS via NEO API
    // ============================
    const NASA_NEO_URL_BASE = "https://api.nasa.gov/neo/rest/v1/neo/browse";
    const NASA_API_KEY = "h7j8n6b5ZzYeZa8YjYHw0ityhOR4xRnyc5dF2jpf";
    const NEO_PAGES = 3;
    const MAX_ASTEROIDS = 200;
    const REFRESH_MINUTES = 60;

    type NEOItem = {
        id: string;
        name: string;
        absolute_magnitude_h?: number;
        estimated_diameter?: {
            kilometers?: { estimated_diameter_min?: number; estimated_diameter_max?: number; }
        };
        is_potentially_hazardous_asteroid?: boolean;
        close_approach_data?: Array<{
            orbiting_body?: string;
            close_approach_date?: string;
            close_approach_date_full?: string;
            relative_velocity?: { kilometers_per_second?: string };
            miss_distance?: { astronomical?: string; lunar?: string; kilometers?: string; }
        }>;
        nasa_jpl_url?: string;
    };

    type NEOResponse = {
        near_earth_objects: NEOItem[];
        links?: { next?: string | null };
        page?: { number: number; total_pages: number; size: number };
    };

    type AsteroidMarker = {
        mesh: THREE.Mesh;
        label?: THREE.Object3D;
        data: {
            id: string;
            name: string;
            H?: number;
            diamKmMin?: number;
            diamKmMax?: number;
            hazardous?: boolean;
            caDate?: string;
            relVelKps?: number;
            missAu?: number;
            missLunar?: number;
            jplUrl?: string;
        };
        focusRing?: THREE.LineSegments;
    };

    const asteroids: AsteroidMarker[] = [];
    let asteroidsGroup: THREE.Group;
    let selectedAsteroid: AsteroidMarker | null = null;

    function toNum(x?: string | number | null): number | undefined {
        if (x == null) return undefined;
        const n = typeof x === "string" ? parseFloat(x) : x;
        return Number.isFinite(n) ? n : undefined;
    }

    function colorForAsteroid(hazardous?: boolean, diamKmMax?: number): number {
        if (hazardous) return 0xff5c5c;
        if ((diamKmMax ?? 0) >= 1.0) return 0xffa64d;
        return 0xffcc66;
    }

    // ---------- Accessibility text formatters ----------
    function formatAsteroidInfoScientist(
        d: AsteroidMarker["data"],
        singleLine = false
    ) {
        const diam =
            d.diamKmMin != null && d.diamKmMax != null
                ? `${d.diamKmMin.toFixed(2)}–${d.diamKmMax.toFixed(2)} km`
                : d.diamKmMax != null
                    ? `${d.diamKmMax.toFixed(2)} km`
                    : "—";
        const parts = [
            `🪨 ${d.name}`,
            d.H != null ? `H ${d.H.toFixed(1)}` : "",
            `Ø ${diam}`,
            d.hazardous ? "⚠ potentially hazardous" : "✅ Listed non-hazardous",
            d.caDate ? `⏱ ${d.caDate}` : "",
            d.relVelKps != null ? `💨 ${d.relVelKps.toFixed(2)} km/s` : "",
            d.missAu != null
                ? `📏 ${d.missAu.toFixed(3)} AU${d.missLunar != null ? ` (${d.missLunar.toFixed(1)} L⊕)` : ""}`
                : "",
        ].filter(Boolean);
        return singleLine ? parts.join(" · ") : parts.join("\n");
    }

    function formatAsteroidInfoKid(
        d: AsteroidMarker["data"],
        singleLine = false
    ) {
        const size =
            d.diamKmMin != null && d.diamKmMax != null
                ? `${d.diamKmMin.toFixed(0)}–${d.diamKmMax.toFixed(0)} km wide`
                : d.diamKmMax != null
                    ? `${d.diamKmMax.toFixed(0)} km wide`
                    : "size unknown";
        const safe = d.hazardous ? "⚠ Could be risky (watched carefully)" : "✅ Not dangerous";
        const when = d.caDate ? `Closest pass: ${d.caDate}` : "";
        const speed = d.relVelKps != null ? `Speed: ${d.relVelKps.toFixed(1)} km/s` : "";
        const distance =
            d.missLunar != null
                ? `Distance: ~${d.missLunar.toFixed(0)} Moon-trips`
                : d.missAu != null
                    ? `Distance: ${d.missAu.toFixed(2)} AU`
                    : "";

        const parts = [
            `🪨 ${d.name} (space rock)`,
            size,
            safe,
            when,
            speed,
            distance
        ].filter(Boolean);
        return singleLine ? parts.join(" · ") : parts.join("\n");
    }

    function formatAsteroidInfo(d: AsteroidMarker["data"], singleLine = false) {
        return accMode === "kid"
            ? formatAsteroidInfoKid(d, singleLine)
            : formatAsteroidInfoScientist(d, singleLine);
    }

    function pickClosestEarthApproachToFuture(item: NEOItem) {
        const now = new Date();
        const eas = (item.close_approach_data ?? []).filter(ca => ca.orbiting_body === "Earth");
        if (eas.length === 0) return undefined;

        let future = eas
            .map(ca => ({ ca, t: new Date(ca.close_approach_date ?? ca.close_approach_date_full ?? "").getTime() }))
            .filter(x => Number.isFinite(x.t) && x.t >= now.getTime())
            .sort((a, b) => a.t - b.t);
        if (future.length > 0) return future[0].ca;

        let past = eas
            .map(ca => ({ ca, t: new Date(ca.close_approach_date ?? ca.close_approach_date_full ?? "").getTime() }))
            .filter(x => Number.isFinite(x.t) && x.t < now.getTime())
            .sort((a, b) => b.t - a.t);
        return past[0]?.ca;
    }

    // ---- line helper
    function polylineFromPoints(points: THREE.Vector3[], hexColor: number) {
        const pos = new Float32Array(points.length * 3);
        for (let i = 0; i < points.length; i++) {
            const v = points[i];
            pos[i * 3 + 0] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.LineBasicMaterial({ color: hexColor, transparent: true, opacity: 0.6 });
        (mat as any).depthTest = false;
        const line = new THREE.Line(geom, mat);
        (line as any).frustumCulled = false;
        (line as any).renderOrder = 999;
        return line;
    }

    const AU_IN_KM = 149_597_870.7;

    function buildTrajectoryForAsteroid(ast: AsteroidMarker): AsteroidTraj | null {
        const earth = planetMeshes["Earth"];
        if (!earth) return null;

        const earthPos = earth.position.clone();
        const asteroidPos = ast.mesh.getWorldPosition(new THREE.Vector3());

        const missAu   = ast.data.missAu ?? 0.15;
        const relVelKps = ast.data.relVelKps ?? 10;

        const dir = new THREE.Vector3().subVectors(asteroidPos, earthPos).normalize();

        const up = new THREE.Vector3(0, 1, 0);
        let side = new THREE.Vector3().crossVectors(dir, up);
        if (side.lengthSq() < 1e-6) {
            up.set(1, 0, 0);
            side = new THREE.Vector3().crossVectors(dir, up);
        }
        side.normalize();

        const closestPoint = new THREE.Vector3().copy(earthPos).addScaledVector(side, au(missAu));

        const distAuPerMin = (relVelKps * 60) / AU_IN_KM;
        const halfLen = THREE.MathUtils.clamp(au(distAuPerMin), au(0.005), au(0.08));

        const start = new THREE.Vector3().copy(closestPoint).addScaledVector(dir, -halfLen);
        const end   = new THREE.Vector3().copy(closestPoint).addScaledVector(dir,  halfLen);

        const samples = 64;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            pts.push(new THREE.Vector3().lerpVectors(start, end, t));
        }
        const line = polylineFromPoints(pts, 0xff7a00);

        const caStr = ast.data.caDate ?? "";
        const caMs = Number.isFinite(Date.parse(caStr)) ? Date.parse(caStr) : NaN;
        const windowMs = TRAJ_HALF_WINDOW_MIN * 2 * 60_000;

        return { line, start, end, caMs, windowMs };
    }

    function makeRoundGlowTexture(): THREE.Texture {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        g.addColorStop(0.0, 'rgba(255,255,255,1)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
        g.addColorStop(1.0, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0,0,size,size);
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearMipMapLinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        return tex;
    }

    // ---- Fetch NEO pages
    async function fetchNEOPages(pages = NEO_PAGES): Promise<NEOItem[]> {
        const all: NEOItem[] = [];
        let page = 0;
        for (let i = 0; i < pages && all.length < MAX_ASTEROIDS; i++) {
            const url = `${NASA_NEO_URL_BASE}?page=${page}&size=20&api_key=${encodeURIComponent(NASA_API_KEY)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`NEO HTTP ${res.status}`);
            const json = (await res.json()) as NEOResponse;
            all.push(...(json.near_earth_objects || []));
            if (!json.links?.next) break;
            page += 1;
        }
        return all.slice(0, MAX_ASTEROIDS);
    }

    // ---- Load & place asteroids + their trajectories
    async function loadAsteroids(earthMesh: THREE.Mesh) {
        if (!earthMesh || !sceneRef) return;

        // Reset groups
        if (asteroidsGroup) earthMesh.remove(asteroidsGroup);
        if (asteroidTrajGroup) earthMesh.remove(asteroidTrajGroup);
        asteroidsGroup = new THREE.Group();
        asteroidTrajGroup = new THREE.Group();
        earthMesh.add(asteroidsGroup);
        earthMesh.add(asteroidTrajGroup);

        asteroids.length = 0;
        trajById.clear();

        try {
            const items = await fetchNEOPages();
            const earthGeom = earthMesh.geometry as THREE.SphereGeometry;
            if (!earthGeom.boundingSphere) earthGeom.computeBoundingSphere();
            const earthR = earthGeom.parameters.radius ?? earthGeom.boundingSphere!.radius;

            const TWO_PI = Math.PI * 2;
            let idx = 0;

            for (const it of items) {
                const ca = pickClosestEarthApproachToFuture(it);
                if (!ca) continue;

                const missAu = toNum(ca.miss_distance?.astronomical);
                const missLunar = toNum(ca.miss_distance?.lunar);
                const relVelKps = toNum(ca.relative_velocity?.kilometers_per_second);
                const H = toNum(it.absolute_magnitude_h);

                const diamMin = toNum(it.estimated_diameter?.kilometers?.estimated_diameter_min);
                const diamMax = toNum(it.estimated_diameter?.kilometers?.estimated_diameter_max);
                const hazardous = !!it.is_potentially_hazardous_asteroid;

                const missAuClamped = Math.max(0.01, Math.min(0.40, (missAu ?? 0.15)));
                const radial = earthR + au(missAuClamped);

                const theta = (idx / Math.max(1, items.length)) * TWO_PI;
                idx += 1;

                const phiTilt = (idx % 11) * (Math.PI / 64);
                const x = radial * Math.cos(theta);
                const z = radial * Math.sin(theta);
                const y = Math.sin(phiTilt) * (earthR * 0.35);

                const diamForSize = Math.min(Math.max(diamMax ?? diamMin ?? 0.08, 0.03), 3.0);
                const markerR = Math.max(earthR * 0.012, Math.min(earthR * 0.06, au(diamForSize / 300)));
                const color = colorForAsteroid(hazardous, diamMax);

                const mat = new THREE.MeshStandardMaterial({
                    color,
                    roughness: 0.6,
                    metalness: 0.2,
                    transparent: true,
                    opacity: 0.95,
                    emissive: new THREE.Color(color),
                    emissiveIntensity: hazardous ? 0.55 : 0.35
                });

                // High-contrast outline
                let outline: THREE.LineSegments | undefined;
                if (accHighContrast) {
                    const edges = new THREE.EdgesGeometry(new THREE.SphereGeometry(markerR, 16, 12));
                    outline = new THREE.LineSegments(
                        edges,
                        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1, transparent: true, opacity: 0.9 })
                    );
                }

                const geom = new THREE.SphereGeometry(markerR, 24, 18);
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.set(x, y, z);
                (mesh as any).userData.__asteroid = true;

                if (accHighContrast && outline) {
                    outline.position.copy(mesh.position);
                    asteroidsGroup.add(outline);
                }

                // soft glow
                const glow = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: makeRoundGlowTexture(),
                    color,
                    opacity: accHighContrast ? 1.0 : 0.75,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    depthTest: false,
                    transparent: true
                }));
                glow.scale.set(markerR * (accHighContrast ? 7 : 6), markerR * (accHighContrast ? 7 : 6), 1);
                mesh.add(glow);

                asteroidsGroup.add(mesh);

                const marker: AsteroidMarker = {
                    mesh,
                    data: {
                        id: it.id,
                        name: it.name,
                        H,
                        diamKmMin: diamMin,
                        diamKmMax: diamMax,
                        hazardous,
                        caDate: ca.close_approach_date_full ?? ca.close_approach_date,
                        relVelKps,
                        missAu,
                        missLunar,
                        jplUrl: it.nasa_jpl_url
                    }
                };
                asteroids.push(marker);

                if (SHOW_ALL_TRAJECTORIES && asteroidTrajGroup) {
                    const traj = buildTrajectoryForAsteroid(marker);
                    if (traj) {
                        asteroidTrajGroup.add(traj.line);
                        trajById.set(marker.data.id, traj);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch NEOs:", err);
        }
    }

    // ---------- Highlight on click ----------
    function highlightAsteroid(target: AsteroidMarker | null) {
        if (selectedAsteroid) {
            const mPrev = selectedAsteroid.mesh.material as THREE.MeshStandardMaterial;
            mPrev.emissiveIntensity = Math.max(0.2, mPrev.emissiveIntensity * 0.5);
            if (selectedAsteroid.label) selectedAsteroid.label.visible = false;
        }
        selectedAsteroid = target;

        if (selectedAsteroid) {
            const m = selectedAsteroid.mesh.material as THREE.MeshStandardMaterial;
            m.emissive = new THREE.Color(0xffffff);
            m.emissiveIntensity = 1.0;

            if (!selectedAsteroid.label) {
                const label = makeLabel(formatAsteroidInfo(selectedAsteroid.data, true));
                const r = (selectedAsteroid.mesh.geometry as THREE.SphereGeometry).boundingSphere?.radius ?? 1;
                selectedAsteroid.mesh.add(label);
                label.position.set(0, r * 1.2, 0);
                selectedAsteroid.label = label;
            } else {
                (selectedAsteroid.label as any).element.textContent =
                    formatAsteroidInfo(selectedAsteroid.data, true);
                selectedAsteroid.label.visible = true;
            }
            updateInfoPanelAsteroid(selectedAsteroid.data);
            ariaLiveMsg = `Selected ${selectedAsteroid.data.name}.`;
        } else {
            updateInfoPanelAsteroid();
            ariaLiveMsg = "Selection cleared.";
        }
    }

    // ---------- Picking ----------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let sceneRef: THREE.Scene;
    let cameraRef: THREE.PerspectiveCamera;

    function setPointerFromEvent(e: PointerEvent) {
        const rect = container.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pickAsteroid() {
        if (!sceneRef || !cameraRef || !asteroidsGroup) return null;
        raycaster.setFromCamera(pointer, cameraRef);
        const intersects = raycaster.intersectObjects(asteroidsGroup.children, true);
        const first = intersects.find(
            (i) =>
                (i.object as any).userData?.__asteroid ||
                i.object.parent?.userData?.__asteroid
        );
        if (!first) return null;
        const mesh = (first.object as any).userData?.__asteroid
            ? (first.object as THREE.Mesh)
            : (first.object.parent as THREE.Mesh);
        return asteroids.find((a) => a.mesh === mesh) ?? null;
    }

    function onPointerMove(e: PointerEvent) {
        setPointerFromEvent(e);
        if (!sceneRef || !cameraRef) return;
        raycaster.setFromCamera(pointer, cameraRef);
        const hit = raycaster
            .intersectObjects(asteroidsGroup?.children ?? [], true)
            .some(
                (i) =>
                    (i.object as any).userData?.__asteroid ||
                    i.object.parent?.userData?.__asteroid
            );
        container.style.cursor = hit ? "pointer" : "default";
    }

    function onClick(e: PointerEvent) {
        setPointerFromEvent(e);
        const picked = pickAsteroid();
        if (!picked) { highlightAsteroid(null); return; }
        if (selectedAsteroid && picked.mesh === selectedAsteroid.mesh) {
            highlightAsteroid(null); return;
        }
        highlightAsteroid(picked);
    }

    // Keyboard "click"
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const picked = pickAsteroid();
            if (picked) highlightAsteroid(picked);
        } else if (e.key === "Escape") {
            highlightAsteroid(null);
        }
    }

    // ---------- Info overlay ----------
    let infoVisible = false;
    let infoHTML = "";
    function updateInfoPanelAsteroid(d?: AsteroidMarker["data"]) {
        if (!d) {
            infoVisible = false;
            infoHTML = "";
            return;
        }

        const diam =
            d.diamKmMin != null && d.diamKmMax != null
                ? `${d.diamKmMin.toFixed(2)}–${d.diamKmMax.toFixed(2)} km`
                : d.diamKmMax != null
                    ? `${d.diamKmMax.toFixed(2)} km`
                    : "—";

        const bodyScientist = `
          <div>🪨 <span>${d.name}</span></div>
          ${d.H != null ? `<div>H <span>${d.H.toFixed(1)}</span></div>` : ""}
          <div>Ø <span>${diam}</span></div>
          <div>${d.hazardous ? "⚠ <span>Potentially hazardous</span>" : "✅ <span>Listed non-hazardous</span>"}</div>
          ${d.caDate ? `<div>⏱ <span>${d.caDate}</span></div>` : ""}
          ${d.relVelKps != null ? `<div>💨 <span>${d.relVelKps.toFixed(2)} km/s</span></div>` : ""}
          ${d.missAu != null ? `<div>📏 <span>${d.missAu.toFixed(3)} AU${d.missLunar != null ? ` (${d.missLunar.toFixed(1)} L⊕)` : ""}</span></div>` : ""}
        `;

        const bodyKid = `
          <div>🪨 <span>${d.name}</span> <small>(space rock)</small></div>
          <div>Size <span>${
            d.diamKmMin != null && d.diamKmMax != null
                ? `${d.diamKmMin.toFixed(0)}–${d.diamKmMax.toFixed(0)} km`
                : d.diamKmMax != null ? `${d.diamKmMax.toFixed(0)} km` : "unknown"
        }</span></div>
          <div>${d.hazardous ? "⚠ <span>Could be risky (watched)</span>" : "✅ <span>Not dangerous</span>"}</div>
          ${d.caDate ? `<div>Closest pass <span>${d.caDate}</span></div>` : ""}
          ${d.relVelKps != null ? `<div>Speed <span>${d.relVelKps.toFixed(1)} km/s</span></div>` : ""}
          ${d.missLunar != null
            ? `<div>How far? <span>~${d.missLunar.toFixed(0)} Moon-trips</span></div>`
            : d.missAu != null ? `<div>How far? <span>${d.missAu.toFixed(2)} AU</span></div>` : ""}
        `;

        infoVisible = true;
        infoHTML = `
          <strong>${accMode === "kid" ? "Space Rock (NEO)" : "Asteroid (NEO)"}</strong><br/>
          ${accMode === "kid" ? bodyKid : bodyScientist}
          ${d.jplUrl ? `<div style="margin-top:6px;"><a href="${d.jplUrl}" target="_blank" rel="noopener">JPL Small-Body DB</a></div>` : ""}
          <div class="muted" id="source">Source: NASA NEO Browse API</div>
        `;
    }

    // ---------- Setup & main loop ----------
    onMount(() => {
        (async () => {
            await tick();

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
            renderer.setSize(container.clientWidth, container.clientHeight, false);
            renderer.domElement.style.display = "block";
            renderer.domElement.style.width = "100%";
            renderer.domElement.style.height = "100%";
            container.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            sceneRef = scene;

            camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.01, 5e6);
            camera.position.set(0, 300, 500);
            cameraRef = camera;

            orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            orbitControls.dampingFactor = 0.05;

            const hemi = new THREE.HemisphereLight(0xffffff, 0x111133, 0.25);
            scene.add(hemi);
            const sunLight = new THREE.PointLight(0xffffff, 3, 0, 2);
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.set(2048, 2048);
            scene.add(sunLight);

            buildStars(scene, 8000);
            buildSolarSystem(scene);
            if (sun) sunLight.position.copy(sun.position);

            labelRenderer = makeLabelRenderer(container);
            labelRenderer.domElement.style.position = "absolute";
            labelRenderer.domElement.style.top = "0";
            labelRenderer.domElement.style.pointerEvents = "none";
            container.appendChild(labelRenderer.domElement);

            // NEOs: initial fetch + refresh
            loadAsteroids(planetMeshes["Earth"]).catch(console.error);
            const refreshId: number = window.setInterval(() => {
                loadAsteroids(planetMeshes["Earth"]).catch(console.error);
            }, REFRESH_MINUTES * 60_000);

            // interactions
            container.addEventListener("pointermove", onPointerMove);
            container.addEventListener("click", onClick);

            // Keyboard
            container.addEventListener("keydown", onKeyDown);
            container.tabIndex = 0; // focusable for keyboard
            container.setAttribute("role", "application");
            container.setAttribute("aria-label", "Interactive solar system with near-Earth objects");

            // start main loop
            last = performance.now();
            requestAnimationFrame(animate);

            // resize handling
            let resizeTimeout: number;
            function handleResizeDebounced() {
                clearTimeout(resizeTimeout);
                resizeTimeout = window.setTimeout(() => {
                    renderer.setSize(container.clientWidth, container.clientHeight);
                    labelRenderer.setSize(container.clientWidth, container.clientHeight);
                    camera.aspect = container.clientWidth / container.clientHeight;
                    camera.updateProjectionMatrix();
                }, 50);
            }
            const resizeObserver = new ResizeObserver(() => handleResizeDebounced());
            resizeObserver.observe(container);
            window.addEventListener("resize", handleResizeDebounced);

            // cleanup
            (onMount as any)._cleanup = () => {
                window.clearInterval(refreshId);
                container.removeEventListener("pointermove", onPointerMove);
                container.removeEventListener("click", onClick);
                container.removeEventListener("keydown", onKeyDown);
                resizeObserver.disconnect();
                window.removeEventListener("resize", handleResizeDebounced);
            };
        })();

        return () => {
            const c = (onMount as any)._cleanup;
            if (typeof c === "function") c();
        };
    });

    // Main animation loop
    function animate(now: number) {
        requestAnimationFrame(animate);
        const dt = (now - last) / 1000;
        last = now;

        time.tick(dt * (controls?.shooting ? controls.yearsPerSec : 0));
        setTimeDays(time.days);

        if (ANIMATE_TRAJECTORIES) {
            const tNow = Date.now();
            for (const ast of asteroids) {
                const traj = trajById.get(ast.data.id);
                if (!traj) continue;
                if (!Number.isFinite(traj.caMs)) continue;

                const t0 = traj.caMs - traj.windowMs / 2;
                const t1 = traj.caMs + traj.windowMs / 2;
                let u = (tNow - t0) / (t1 - t0);
                u = THREE.MathUtils.clamp(u, 0, 1);

                const eased = 1 - Math.pow(1 - u, 3);

                const pos = new THREE.Vector3().lerpVectors(traj.start, traj.end, eased);
                ast.mesh.position.copy(pos);
            }
        }

        updateDynamicBodies(dt);
        orbitControls.update();
        renderer.render(sceneRef, camera);
        labelRenderer.render(sceneRef, camera);
    }

    // ---------- UI handlers ----------
    function toggleMode() {
        accMode = accMode === "scientist" ? "kid" : "scientist";
        if (selectedAsteroid) {
            updateInfoPanelAsteroid(selectedAsteroid.data);
            (selectedAsteroid.label as any)?.element && ((selectedAsteroid.label as any).element.textContent =
                formatAsteroidInfo(selectedAsteroid.data, true));
        }
        ariaLiveMsg = `Accessibility mode: ${accMode === "kid" ? "Kid" : "Scientist"}.`;
    }
</script>

<!-- Accessibility toolbar -->
<div class="acc-toolbar" role="toolbar" aria-label="Accessibility options">
    <button
            class="acc-toggle"
            on:click={toggleMode}
            aria-pressed={accMode === "kid"}
            aria-label="Toggle Simple and friendly text"
            title="Toggle Simple and friendly text"
    >
        {accMode === "kid" ? "Simple mode" : "Advanced Mode"}
    </button>

</div>

<!-- Screen reader announcements -->
<div class="sr-only" aria-live="polite">{ariaLiveMsg}</div>

{#if infoVisible}
    <div class="info-card" on:click={() => (infoVisible = false)}>
        <div class="info-inner"
             role="dialog"
             aria-modal="true"
             aria-label={accMode === "kid" ? "Space Rock details" : "Asteroid details"}
             on:click|stopPropagation>
            <button class="close"
                    aria-label="Close details"
                    on:click={() => (infoVisible = false)}>✕</button>
            <div class="content">{@html infoHTML}</div>
            <div class="hint">Click outside to close</div>
        </div>
    </div>
{/if}

<div id="orbits-container" bind:this={container} class="flex-1 w-full h-full"></div>

<style>
    /* Accessibility toolbar */
    .acc-toolbar {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 11;
        gap: 8px;
        align-items: center;
        background: rgba(15,18,32,0.85);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 6px 8px;
        backdrop-filter: blur(6px);

    }
    .accesstitle{
        font-size: 18px;
        text-align: center;
    }
    .accesssub{
        font-size: 12px;
        text-align: left;
    }
    .acc-toggle {
        appearance: none;
        border: 1px solid rgba(255,255,255,0.18);
        background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12));
        color: #e9eefc;
        padding: 6px 10px;
        border-radius: 10px;
        font-size: 14px;
        cursor: pointer;
    }
    .acc-toggle[aria-pressed="true"] {
        outline: 2px solid #ffffff;
        outline-offset: 1px;
        font-weight: 700;
    }
    .acc-check {
        display: inline-flex;
        gap: 6px;
        align-items: center;
        color: #e9eefc;
        font-size: 14px;
        user-select: none;
    }
    .acc-check input {
        accent-color: #ffffff;
    }

    /* Focus ring for keyboard users on the canvas */
    #orbits-container:focus {
        outline: 2px solid #8ab4ff;
        outline-offset: 4px;
    }

    /* Screen-reader only helper */
    .sr-only {
        position: absolute !important;
        width: 1px; height: 1px;
        padding: 0; margin: -1px;
        overflow: hidden; clip: rect(0, 0, 0, 0);
        white-space: nowrap; border: 0;
    }

    /* Existing styles */
    #orbits-container {
        position: relative;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: radial-gradient(ellipse at center, #0b1022 0%, #050812 60%, #03050b 100%);
    }
    .info-card {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        z-index: 10;
        pointer-events: auto;
        user-select: text;
    }
    .info-inner {
        min-width: 260px;
        max-width: 360px;
        background: rgba(15, 18, 32, 0.95);
        color: #e9eefc;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 15px;
        padding: 12px 14px 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.35);
        font: 500 18px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
    }
    .info-inner .close {
        position: absolute;
        top: 6px;
        right: 10px;
        font-size: 14px;
        opacity: 0.7;
        cursor: pointer;
        background: transparent;
        border: 0;
        color: inherit;
    }
    .info-inner #source{ font-size: 10px; }
    .info-inner .content div { margin: 2px 0; }
    .info-inner .content .muted { margin-top: 6px; opacity: 0.6; font-size: 11px; }
    .info-inner .hint {
        margin-top: 6px;
        opacity: 0.5;
        font-size: 11px;
        text-align: right;
    }
</style>
