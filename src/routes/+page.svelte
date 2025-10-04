<script lang="ts">
  import ControllerSidebar from './ControllerSidebar.svelte';
  import EarthMap from './visualizers/EarthMap.svelte';
  import Orbits from './visualizers/Orbits.svelte';
  
  import type { Controls } from "./controls";
  import { Tabs, TabItem } from 'flowbite-svelte';

  const controls: Controls = {
    daysPerSec: 1
  };
</script>

<div class="flex h-screen bg-slate-950 text-white">
  <!-- Sidebar fijo -->
  <ControllerSidebar controls={controls} class="flex-none w-64" />

  <!-- Contenido principal -->
  <main class="flex-1 flex flex-col overflow-hidden">
    <Tabs style="underline">
      
      <TabItem open title="3D Orbit" class="flex-1 flex flex-col overflow-hidden">
        <!-- Contenedor del canvas -->
        <div class="flex-1 flex overflow-hidden">
          <Orbits controls={controls} class="flex-1 w-full h-full" />
        </div>
      </TabItem>

      <TabItem title="Earth Map" class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 flex overflow-hidden">
          <EarthMap class="flex-1 w-full h-full" />
        </div>
      </TabItem>

    </Tabs>
  </main>
</div>
