<script lang="ts">
    import ControllerSidebar from "./ControllerSidebar.svelte";
    import EarthMap from "./visualizers/EarthMap.svelte";
    import OrbitsSimulation from "./visualizers/OrbitsSimulation.svelte";
    import Realtime from "./visualizers/Realtime.svelte";

    import type { Controls } from "./controls";
    import { writable, type Writable } from "svelte/store";

    /* Transitions + logo for splash */
    import { fade } from "svelte/transition";
    import favicon from "$lib/assets/impactlab.png";

    const controls: Writable<Controls> = writable({
        yearsPerSec: 0.05,
        shooting: false,
        size: 5,
        distance: 10000,
        velocity: 10,
        latitude: 28.5,
        longitude: -106
    });

    // Sidebar and tab logic
    const sidebarOpen = writable(true);
    function toggleSidebar() {
        sidebarOpen.update((v) => !v);
    }

    const currentTab = writable<"fun" | "real" | "earth">("fun");

    // Splash state
    const splashVisible = writable(false);
    const SPLASH_MS = 500; // duration of splash (ms)

    function go(tab: "fun" | "real" | "earth") {
        if ($currentTab === tab) return; // no-op if same tab
        splashVisible.set(true);
        setTimeout(() => {
            currentTab.set(tab);
            // allow new content to mount before fading splash away
            requestAnimationFrame(() => splashVisible.set(false));
        }, SPLASH_MS);
    }
</script>

<div class="app-container">
    <!-- Minimal tab buttons -->
    <nav class="tab-buttons" aria-label="Views">
        <button
                class:active={$currentTab === "real"}
                aria-pressed={$currentTab === "real"}
                on:click={() => go("real")}
        >
            Real Time
        </button>
        <button
                class:active={$currentTab === "fun"}
                aria-pressed={$currentTab === "fun"}
                on:click={() => go("fun")}
        >
            Simulation
        </button>
        <button
                class:active={$currentTab === "earth"}
                aria-pressed={$currentTab === "earth"}
                on:click={() => go("earth")}
        >
            Earth Map
        </button>
    </nav>

    <!-- Splash overlay -->
    {#if $splashVisible}
        <div class="splash" in:fade={{ duration: 180 }} out:fade={{ duration: 200 }}>
            <img src={favicon} alt="Impact Lab Logo" class="splash-logo" />
        </div>
    {/if}

    <!-- Page content -->
    {#if $currentTab === "fun"}
        <div class="tab-content" in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
            <aside class="sidebar" class:collapsed={!$sidebarOpen}>
                <div class="sidebar-inner" class:hide-content={!$sidebarOpen}>
                    <ControllerSidebar {controls} />
                </div>
            </aside>

            <button class="toggle-btn" on:click={toggleSidebar} aria-label="Toggle sidebar">
                {#if $sidebarOpen} ← {:else} → {/if}
            </button>

            <section class="visualizer">
                <OrbitsSimulation {controls} />
            </section>
        </div>
    {:else if $currentTab === "real"}
        <div class="tab-content" in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
            <section class="visualizer no-sidebar">
                <Realtime {controls} />
            </section>
        </div>
    {:else if $currentTab === "earth"}
        <div class="tab-content" in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
            <aside class="sidebar" class:collapsed={!$sidebarOpen}>
                <div class="sidebar-inner" class:hide-content={!$sidebarOpen}>
                    <!-- Hide Start/Stop and TimeScale on Earth Map -->
                    <ControllerSidebar
                            {controls}
                            showShooting={false}
                            showTimeScale={false}
                    />
                </div>
            </aside>

            <button class="toggle-btn" on:click={toggleSidebar} aria-label="Toggle sidebar">
                {#if $sidebarOpen} ← {:else} → {/if}
            </button>

            <section class="visualizer">
                <EarthMap {controls} />
            </section>
        </div>
    {/if}
</div>

<style>
    :root {
        --sidebar-width: 16rem;
    }

    html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        background-color: #0f172a;
        color: #f1f5f9;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
    }

    .app-container {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
    }

    /* Minimal top buttons */
    .tab-buttons {
        display: flex;
        justify-content: center;
        gap: 1rem;
        padding: 0.9rem 1rem;
        background-color: #1e293b;
        border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .tab-buttons button {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 1.05rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        border-radius: 0.5rem;
        transition: transform 0.1s ease, background-color 0.2s ease, color 0.2s ease;
        outline-offset: 3px;
    }
    .tab-buttons button:hover {
        color: #f1f5f9;
        background-color: rgba(255,255,255,0.06);
    }
    .tab-buttons button.active {
        color: #f1f5f9;
        background-color: #334155;
    }
    .tab-buttons button:active {
        transform: translateY(1px);
    }

    .tab-content {
        display: flex;
        flex: 1;
        position: relative;
    }

    /* Sidebar */
    .sidebar {
        flex: none;
        width: var(--sidebar-width);
        background-color: #1f2937;
        overflow: hidden;
        transition: width 0.3s ease-in-out;
    }
    .sidebar.collapsed {
        width: 0;
    }
    .sidebar-inner {
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    .hide-content {
        display: none;
    }

    /* Toggle button */
    .toggle-btn {
        position: absolute;
        top: 50%;
        left: var(--sidebar-width);
        transform: translateY(-50%);
        background-color: #1f2937;
        color: #e5e7eb;
        cursor: pointer;
        width: 2.5rem;
        height: 4rem;
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        border: none;
        border-top-right-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
        transition: transform 0.2s, left 0.3s ease-in-out;
    }
    .sidebar.collapsed + .toggle-btn {
        left: 0;
    }
    .toggle-btn:hover {
        transform: translateY(-50%) scale(1.1);
    }

    /* Visualizer */
    .visualizer {
        flex: 1;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    /* Splash overlay */
    .splash {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(2, 6, 23, 0.75);
        z-index: 2000;
        pointer-events: none; /* let clicks pass through if needed */
    }
    .splash-logo {
        width: 120px;
        height: 120px;
        object-fit: contain;
        animation: pulseScale 500ms ease-out;
        filter: drop-shadow(0 6px 16px rgba(0,0,0,0.35));
    }
    @keyframes pulseScale {
        from { transform: scale(0.9); opacity: 0.9; }
        to   { transform: scale(1.0); opacity: 1; }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
        .tab-buttons button,
        .toggle-btn { transition: none; }
        .splash-logo { animation: none; }
    }
</style>
