<script lang="ts">
  import favicon from "$lib/assets/impactlab.png";
  import type { Controls } from "./controls";

  export let controls: Controls;

  // Inicializamos shooting si no existe
  if (controls.shooting === undefined) {
    controls.shooting = false;
  }

  function toggleShooting() {
    controls.shooting = !controls.shooting;
  }
</script>

<div class="flex h-screen bg-gray-100">
  <!-- Sidebar -->
  <aside class="w-64 bg-gray-800 text-white p-4 flex-shrink-0 flex flex-col">
    <div class="sidebar-inner overflow-y-auto flex-1 flex flex-col">
      <!-- Logo -->
      <div class="mb-6 flex justify-center">
        <img
          src={favicon}
          alt="Impact Lab Logo"
          class="h-40 w-auto object-contain"
        />
      </div>

      <h2 class="text-xl font-bold mb-4">Impact Parameters</h2>

      <div class="space-y-4 flex-1">
        <div>
          <label class="block mb-1">Asteroid Size (km)</label>
          <input type="number" class="w-full p-2 rounded text-black"
            bind:value={controls.size}
          />
        </div>
        <div>
          <label class="block mb-1">Distance From Earth (km)</label>
          <input type="number" class="w-full p-2 rounded text-black"
            bind:value={controls.distance}
          />
        </div>
        <div>
          <label class="block mb-1">Velocity (km/s)</label>
          <input type="number" class="w-full p-2 rounded text-black"
            bind:value={controls.velocity}
          />
        </div>

        <div>
          <label class="block mb-1">Latitude (°)</label>
          <input
            type="number"
            class="w-full p-2 rounded text-black"
            step="0.0001"
            min="-90"
            max="90"
            bind:value={controls.latitude}
          />
        </div>
        <div>
          <label class="block mb-1">Longitude (°)</label>
          <input
            type="number"
            class="w-full p-2 rounded text-black"
            step="0.0001"
            min="-180"
            max="180" 
            bind:value={controls.longitude}
          />
        </div>

        <!-- Shooting Button -->
        <div class="mt-4">
          <button
            class="w-full py-3 rounded font-bold transition-colors shooting-btn {controls.shooting
              ? 'shooting-active'
              : 'shooting-ready'}"
            on:click={toggleShooting}
          >
            {controls.shooting ? "Stop the Impact" : "Ready for Impact"}
          </button>
        </div>
      </div>

      <div class="time">
        <label for="time-scale">
          Time Scale: {controls.yearsPerSec} years/second
        </label>
        <input
          id="time-scale"
          type="range"
          min="0"
          max="5"
          step="0.05"
          bind:value={controls.yearsPerSec}
          class="w-full"
        />
      </div>
    </div>
  </aside>
</div>

<style>
  html,
  body {
    height: 100%;
    margin: 0;
  }

  .flex {
    display: flex;
  }

  .h-screen {
    height: 100vh;
  }

  .bg-gray-100 {
    background-color: #f3f4f6;
  }

  /* Sidebar */
  aside {
    flex: none;
    width: 16rem;
    display: flex;
    flex-direction: column;
    background-color: #1f2937; /* slate-800 */
    color: white;
    padding: 1rem;
  }

  /* Scrollable content */
  .sidebar-inner {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
  }

  /* Inputs */
  input[type="number"] {
    background-color: white;
    color: black;
    border: 1px solid #d1d5db;
  }

  /* Shooting button */
  .shooting-btn {
    transition: all 0.2s ease;
    font-size: 1.1rem;
    text-align: center;
  }

  .shooting-ready {
    background-color: #ef4444; /* rojo */
    color: white;
  }

  .shooting-active {
    background-color: #10b981; /* verde */
    color: white;
  }

  /* Optional: hide scrollbar on Webkit */
  .sidebar-inner::-webkit-scrollbar {
    width: 6px;
  }

  .sidebar-inner::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
</style>
