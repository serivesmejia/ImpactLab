<script lang="ts">
    import { writable, type Writable } from "svelte/store";
    import { fade } from "svelte/transition";
    import favicon from "$lib/assets/impactlab.png"; // ✅ your logo path

    // controls + sidebar logic (keep your existing)
    import ControllerSidebar from "./ControllerSidebar.svelte";
    import EarthMap from "./visualizers/EarthMap.svelte";
    import OrbitsSimulation from "./visualizers/OrbitsSimulation.svelte";
    import Realtime from "./visualizers/Realtime.svelte";
    import type { Controls } from "./controls";

    const controls: Writable<Controls> = writable({
        yearsPerSec: 0.05,
        shooting: false,
        size: 5,
        distance: 10000,
        velocity: 10,
        latitude: 28.5,
        longitude: -106
    });

    const sidebarOpen = writable(true);
    function toggleSidebar() { sidebarOpen.update((v) => !v); }

    // active tab + splash state
    const currentTab = writable<"fun" | "real" | "earth">("fun");
    const splashVisible = writable(false);
    const SPLASH_MS = 500;

    function go(tab: "fun" | "real" | "earth") {
        splashVisible.set(true);
        setTimeout(() => {
            currentTab.set(tab);
            requestAnimationFrame(() => splashVisible.set(false));
        }, SPLASH_MS);
    }
</script>
