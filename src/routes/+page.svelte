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

<div class="app-container">
  <!-- Sidebar fijo -->
  <ControllerSidebar controls={controls}/>

  <!-- Contenido principal -->
  <main class="main-content">
    <div class="tabs-wrapper">
      <Tabs style="underline">
        
        <TabItem open title="3D Orbit">
          <div class="tab-content">
            <Orbits controls={controls}/>
          </div>
        </TabItem>

        <TabItem title="Earth Map">
          <div class="tab-content">
            <EarthMap/>
          </div>
        </TabItem>

      </Tabs>
    </div>
  </main>
</div>

<style>
.app-container {
  display: flex;
  height: 100vh;
  background-color: #1e293b; /* slate-950 */
  color: white;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Flowbite Tabs wrapper must stretch */
.tabs-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}


.tab-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
