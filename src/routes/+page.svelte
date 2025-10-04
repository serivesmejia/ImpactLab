<script>
  import ControllerSidebar from './ControllerSidebar.svelte';
  import EarthMap from './visualizers/EarthMap.svelte';
  import Orbits from './visualizers/Orbits.svelte';
  
  // 1. Importa los componentes de Flowbite Svelte
  import { Tabs, TabItem } from 'flowbite-svelte';
</script>

<div class="flex h-screen bg-slate-950 text-white">
  <ControllerSidebar />

  <main class="flex-grow p-8 overflow-y-auto">
    
    <Tabs style="underline">
      <TabItem title="3D Orbit">
        <Orbits />
      </TabItem>
        
      <TabItem open title="Earth Map">
        <EarthMap />
      </TabItem>
    </Tabs>

  </main>
</div>