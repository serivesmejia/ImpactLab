<script lang="ts">
  import { onMount } from "svelte";
  let mapContainer: HTMLDivElement;

  onMount(async () => {
    // Dynamically import Leaflet to avoid SSR issues
    const L = await import("leaflet");
    
    let m = L.map(mapContainer, {
        minZoom: 2.4,
        maxZoom: 18,
        zoom: 2.4,
        center: [0, 0],
        preferCanvas: true
    });
    

    L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", { // Changed to a dark theme tile
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(m);

    // This is crucial for maps inside hidden containers like tabs
    setTimeout(() => {
        m.invalidateSize();
    }, 0);
  });
</script>

<style>
    .map {
        /* Give the map a specific height */
        height: 90vh; /* 75% of the viewport height */
        width: 100%;
        border-radius: 0.5rem; /* Optional: adds rounded corners */
        overflow: hidden;
    }
</style>

<link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
/>

<div bind:this={mapContainer} class="map"></div>