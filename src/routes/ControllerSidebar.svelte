<script lang="ts">
    import favicon from "$lib/assets/impactlab.png";
    import type { Writable } from "svelte/store";
    import type { Controls } from "./controls";

    export let controls: Writable<Controls>;
    export let showShooting: boolean = true;   // NEW
    export let showTimeScale: boolean = true;  // NEW

    // Ensure default
    if ($controls.shooting === undefined) {
        $controls.shooting = false;
    }

    function toggleShooting() {
        $controls.shooting = !$controls.shooting;
    }
</script>

<div class="flex h-full bg-gray-100">
    <!-- Sidebar -->
    <aside class="w-64 bg-gray-800 text-white p-4 flex-shrink-0 flex flex-col">
        <div class="sidebar-inner overflow-y-auto flex-1 flex flex-col">
            <!-- Logo -->
            <div class="mb-6 flex justify-center">
                <img src={favicon} alt="Impact Lab Logo" class="h-40 w-auto object-contain" />
            </div>

            <h2 class="text-xl font-bold mb-4">Impact Parameters</h2>

            <div class="space-y-4 flex-1">
                <div>
                    <label class="block mb-1">Asteroid Size (km)</label>
                    <input type="number" class="w-full p-2 rounded text-black" bind:value={$controls.size} />
                </div>
                <div>
                    <label class="block mb-1">Distance From Earth (km)</label>
                    <input type="number" class="w-full p-2 rounded text-black" bind:value={$controls.distance} />
                </div>
                <div>
                    <label class="block mb-1">Velocity (km/s)</label>
                    <input type="number" class="w-full p-2 rounded text-black" bind:value={$controls.velocity} />
                </div>

                <div>
                    <label class="block mb-1">Latitude (°)</label>
                    <input type="number" class="w-full p-2 rounded text-black" step="0.0001" min="-90" max="90" bind:value={$controls.latitude} />
                </div>
                <div>
                    <label class="block mb-1">Longitude (°)</label>
                    <input type="number" class="w-full p-2 rounded text-black" step="0.0001" min="-180" max="180" bind:value={$controls.longitude} />
                </div>

                <!-- Shooting Button (conditional) -->
                {#if showShooting}
                    <div class="mt-4">
                        <button
                                class="w-full py-3 rounded font-bold transition-colors shooting-btn {$controls.shooting ? 'shooting-active' : 'shooting-ready'}"
                                on:click={toggleShooting}
                        >
                            {$controls.shooting ? "Stop the Impact" : "Start the Impact"}
                        </button>
                    </div>
                {/if}
            </div>

            <!-- Time Scale (conditional) -->
            {#if showTimeScale}
                <div class="time mt-4">
                    <label for="time-scale">Time Scale: {$controls.yearsPerSec} years/second</label>
                    <input
                            id="time-scale"
                            type="range"
                            min="0.05"
                            max="1.5"
                            step="0.05"
                            bind:value={$controls.yearsPerSec}
                            class="w-full"
                    />
                </div>
            {/if}
        </div>
    </aside>
</div>

<style>
    .flex { display: flex; }
    .bg-gray-100 { background-color: rgb(243, 244, 246); }
    aside { width: 16rem; background-color: #1f2937; color: white; padding: 1rem; }
    .sidebar-inner { display: flex; flex-direction: column; flex: 1; overflow-y: auto; }
    input[type="number"] { background-color: white; color: black; border: 1px solid #d1d5db; }
    .shooting-btn { transition: all 0.2s ease; font-size: 1.1rem; text-align: center; }
    .shooting-ready { background-color: #ef4444; color: white; }
    .shooting-active { background-color: #10b981; color: white; }
    .sidebar-inner::-webkit-scrollbar { width: 6px; }
    .sidebar-inner::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.3); border-radius: 3px; }
</style>
