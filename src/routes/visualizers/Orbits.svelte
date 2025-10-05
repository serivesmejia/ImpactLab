<script lang="ts">
    import { onMount, tick } from "svelte";
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
    import { makeLabel, makeLabelRenderer } from "../space_util/ui";
    import { elementsToPosition, au } from "../space_util/kepler";
    import { buildStars } from "../space_util/stars";
    import { TimeController } from "../space_util/time";
    import type { Controls } from "../controls";

    export let controls: Controls;

    let container: HTMLDivElement;

    // Planetas
    const bodies = [
        {
            name: "Mercury",
            color: 0xc6b18b,
            a: 0.387098,
            e: 0.20563,
            i: 7.0049,
            O: 48.331,
            w: 29.124,
            P: 87.969,
        },
        {
            name: "Venus",
            color: 0xd9c08f,
            a: 0.723332,
            e: 0.006772,
            i: 3.3946,
            O: 76.68,
            w: 54.884,
            P: 224.701,
        },
        {
            name: "Earth",
            color: 0x88aaff,
            a: 1.0,
            e: 0.01671,
            i: 0.0,
            O: -11.26,
            w: 102.947,
            P: 365.256,
        },
        {
            name: "Mars",
            color: 0xff6f4f,
            a: 1.523679,
            e: 0.0934,
            i: 1.85,
            O: 49.558,
            w: 286.502,
            P: 686.98,
        },
        {
            name: "Jupiter",
            color: 0xffd29b,
            a: 5.204267,
            e: 0.048775,
            i: 1.303,
            O: 100.464,
            w: 273.867,
            P: 4332.589,
        },
        {
            name: "Saturn",
            color: 0xf2e3b6,
            a: 9.582017,
            e: 0.055723,
            i: 2.485,
            O: 113.665,
            w: 339.392,
            P: 10759.22,
        },
        {
            name: "Uranus",
            color: 0xa0d8ff,
            a: 19.18916,
            e: 0.04722,
            i: 0.773,
            O: 74.006,
            w: 96.998,
            P: 30685.4,
        },
        {
            name: "Neptune",
            color: 0x6fb6ff,
            a: 30.06992,
            e: 0.00859,
            i: 1.77,
            O: 131.784,
            w: 276.336,
            P: 60190,
        },
    ];

    let planetMeshes: Record<string, THREE.Mesh> = {};
    let planetLabels: Record<string, THREE.Object3D> = {};
    let sun: THREE.Mesh;
    const time = new TimeController();

    // Meteoritos dinámicos
    type DynamicBody = {
        mesh: THREE.Mesh;
        mass: number;
        position: THREE.Vector3;
        velocity: THREE.Vector3;
    };
    let dynamicBodies: DynamicBody[] = [];

    // Construir el sistema solar
    function buildSolarSystem(scene: THREE.Scene) {
        sun = new THREE.Mesh(
            new THREE.SphereGeometry(au(0.08), 32, 16),
            new THREE.MeshBasicMaterial({ color: 0xffd27f }),
        );
        scene.add(sun);

        bodies.forEach((p) => {
            const radiusAU = Math.max(
                0.015,
                0.003 + Math.log10(p.a + 1) * 0.01,
            );
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(au(radiusAU), 32, 16),
                new THREE.MeshStandardMaterial({
                    color: p.color,
                    roughness: 0.8,
                    metalness: 0,
                }),
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
            const line = new THREE.LineLoop(
                curveGeo,
                new THREE.LineBasicMaterial({
                    color: p.color,
                    transparent: true,
                    opacity: 0.35,
                }),
            );
            scene.add(line);
        });

        setTimeDays(0);
    }

    // Actualizar posiciones de planetas
    function setTimeDays(days: number) {
        bodies.forEach((p) => {
            const n = 360 / p.P;
            const M = n * days;
            const pos = elementsToPosition(p.a, p.e, p.i, p.O, p.w, M);
            planetMeshes[p.name].position.copy(pos);
        });
    }

    // Función para agregar meteoritos
    function addMeteorite(
        scene: THREE.Scene,
        params: {
            position: [number, number, number];
            velocity: [number, number, number];
            mass: number;
            radius?: number;
            color?: number;
        },
    ) {
        const {
            position,
            velocity,
            mass,
            radius = 0.001,
            color = 0xffaa00,
        } = params;

        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(au(radius), 16, 8),
            new THREE.MeshStandardMaterial({ color }),
        );

        mesh.position.set(...position);
        scene.add(mesh);

        dynamicBodies.push({
            mesh,
            mass,
            position: new THREE.Vector3(...position),
            velocity: new THREE.Vector3(...velocity),
        });

        return mesh;
    }

    // Simulación de movimiento (solo órbitas simples)
    function updateDynamicBodies(dt: number) {
        dynamicBodies.forEach((body) => {
            // Mover en línea recta como prueba (sin gravedad real)
            body.position.addScaledVector(body.velocity, dt);
            body.mesh.position.copy(body.position);
        });
    }

    onMount(async () => {
        await tick();

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight, false);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            55,
            container.clientWidth / container.clientHeight,
            0.01,
            5e6,
        );
        camera.position.set(0, 300, 500);

        const orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;

        // Luces
        const hemi = new THREE.HemisphereLight(0xffffff, 0x111133, 0.25);
        scene.add(hemi);

        const sunLight = new THREE.PointLight(0xffffff, 3, 0, 2);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(2048, 2048);
        scene.add(sunLight);

        buildStars(scene, 8000);
        buildSolarSystem(scene);
        if (sun) sunLight.position.copy(sun.position);

        const labelRenderer = makeLabelRenderer(container);
        labelRenderer.domElement.style.position = "absolute";
        labelRenderer.domElement.style.top = "0";
        labelRenderer.domElement.style.pointerEvents = "none";
        container.appendChild(labelRenderer.domElement);

        let last = performance.now();
        function animate(now: number) {
            requestAnimationFrame(animate);
            const dt = (now - last) / 1000;
            last = now;

            time.tick(dt * (controls.shooting ? controls.yearsPerSec : 0));
            setTimeDays(time.days);

            updateDynamicBodies(dt); // actualizar meteoritos

            orbitControls.update();
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        }
        requestAnimationFrame(animate);
        let resizeTimeout: number;

        function handleResizeDebounced() {
            clearTimeout(resizeTimeout);
            resizeTimeout = window.setTimeout(() => {
                renderer.setSize(container.clientWidth, container.clientHeight);
                labelRenderer.setSize(
                    container.clientWidth,
                    container.clientHeight,
                );
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
            }, 50);
        }

        // use resize observer for container
        const resizeObserver = new ResizeObserver(() => {
            handleResizeDebounced();
        });
        resizeObserver.observe(container);

        // También para cambios de window
        window.addEventListener("resize", handleResizeDebounced);
    });
</script>

<div
    id="orbits-container"
    bind:this={container}
    class="flex-1 w-full h-full"
></div>

<style>
    #orbits-container {
        position: relative;
        width: 100%;
        height: 100vh;
        overflow: hidden;
    }
</style>
