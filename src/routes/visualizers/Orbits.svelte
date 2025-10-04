<script lang="ts">
    import { onMount } from "svelte";
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
    import { makeLabel, makeLabelRenderer } from "../util/ui";
    import { elementsToPosition, au } from "../util/kepler";
    import { buildStars } from "../util/stars";
    import { TimeController } from "../util/time";

    let container: HTMLDivElement;

    const bodies = [
        {
            name: "Mercury",
            color: 0xc6b18b,
            a: 0.387098,
            e: 0.20563,
            i: 7.0049,
            O: 48.331,
            w: 29.124,
            L: 252.251,
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
            L: 181.979,
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
            L: 100.464,
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
            L: 355.453,
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
            L: 34.404,
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
            L: 49.944,
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
            L: 313.232,
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
            L: -55.12,
            P: 60190,
        },
    ];

    let planetMeshes: Record<string, THREE.Mesh> = {};
    let planetLabels: Record<string, THREE.Object3D> = {};
    let sun: THREE.Mesh;
    const time = new TimeController();

    function buildSolarSystem(scene: THREE.Scene) {
        sun = new THREE.Mesh(
            new THREE.SphereGeometry(au(0.02), 32, 16),
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

        setTimeDays(0); // <-- para alinearlos desde el inicio
    }

    function setTimeDays(days: number) {
        bodies.forEach((p) => {
            const n = 360 / p.P;
            const M = n * days;
            const pos = elementsToPosition(p.a, p.e, p.i, p.O, p.w, M);
            planetMeshes[p.name].position.copy(pos);
        });
    }

    onMount(() => {
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            55,
            container.clientWidth / container.clientHeight,
            0.01,
            5e6,
        );
        camera.position.set(0, 300, 500);

        // 👇 OrbitControls para mover cámara con el mouse
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        scene.add(new THREE.HemisphereLight(0xffffff, 0x111133, 0.25));
        scene.add(new THREE.PointLight(0xffffff, 3, 0, 2));

        buildStars(scene, 8000);
        buildSolarSystem(scene);

        let labelRenderer = makeLabelRenderer();
        container.appendChild(labelRenderer.domElement);

        let last = performance.now();
        function animate(now: number) {
            const dt = (now - last) / 1000;
            last = now;
            time.tick(dt);
            setTimeDays(time.days);

            controls.update(); // 👈 importante para damping
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);

        window.addEventListener("resize", () => {
            renderer.setSize(container.clientWidth, container.clientHeight);
            labelRenderer.setSize(
                container.clientWidth,
                container.clientHeight,
            );
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
        });
    });
</script>

<div id="orbits-container" bind:this={container}></div>

<style>
    div#orbits-container {
        height: 80vh;
        width: 100%;
        border-radius: 0.5rem;
        overflow: hidden;
    }
</style>
