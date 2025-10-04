<script lang="ts">
	import favicon from '$lib/assets/impactlab.png';
  import type { Controls } from "./controls";

  export let controls: Controls;
</script>

<div class="flex h-screen bg-gray-100">
  <!-- Sidebar -->
  <aside class="w-64 bg-gray-800 text-white p-4 flex-shrink-0 flex flex-col">
    <!-- Logo -->
    <div class="mb-6 flex justify-center">
      <img src={favicon} alt="Impact Lab Logo" class="h-32 w-auto object-contain" />
    </div>

    <h2 class="text-xl font-bold mb-4">Impact Parameters</h2>
    <div class="space-y-4 flex-1">
      <div>
        <label class="block mb-1">Asteroid Size (km)</label>
        <input type="number" class="w-full p-2 rounded text-black" />
      </div>
      <div>
        <label class="block mb-1">Velocity (km/s)</label>
        <input type="number" class="w-full p-2 rounded text-black" />
      </div>
      <div>
        <label class="block mb-1">Impact Angle (°)</label>
        <input type="number" class="w-full p-2 rounded text-black" />
      </div>

      <div class="time">
        <label for="time-scale">
          Time Scale: {controls.daysPerSec} days/second
        </label>
        <input
          id="time-scale"
          type="range"
          min="0"
          max="10"
          step="0.1"
          bind:value={controls.daysPerSec}
          class="w-full"
        />
      </div>
    </div>
  </aside>
</div>
