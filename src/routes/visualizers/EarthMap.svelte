<script lang="ts">
  import { onMount } from "svelte";
  import type { Controls } from "./controls";
  import type { Writable } from "svelte/store";
  import type { Map } from "leaflet";

  export let controls: Writable<Controls>;

  let mapContainer: HTMLDivElement;
  let map: Map;
  let impactCircle: any;
  let lethalCircle: any;
  let mounted = false; // controla si ya se hizo clic en el mapa

  function calculateImpactRadiusKm(c: Controls) {
    const D = c.size ?? 1;
    const v = c.velocity ?? 20;
    const radiusKm = 10 * Math.pow(D, 0.78) * Math.pow(v, 0.44);
    return radiusKm;
  }

  function calculateLethalRadiusKm(controls: Controls) {
    const density = 3000; // kg/m³
    const radiusM = (controls.size * 1000) / 2;
    const volume = (4 / 3) * Math.PI * radiusM ** 3;
    const mass = volume * density;
    const velocityMs = controls.velocity * 1000;
    const energyJ = 0.5 * mass * velocityMs ** 2;

    const k = 0.05;
    return (Math.cbrt(energyJ) * k) / 1000;
  }

  onMount(async () => {
    const L = await import("leaflet");

    map = L.map(mapContainer, {
      minZoom: 2.4,
      maxZoom: 18,
      zoom: 2.4,
      center: [0, 0],
      preferCanvas: true,
    });

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        noWrap: true,
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      },
    ).addTo(map);

    impactCircle = L.circle([0, 0], { radius: 1000, color: "red", weight: 2 });
    impactCircle.addTo(map);

    lethalCircle = L.circle([0, 0], {
      radius: 0 * 1000,
      color: "yellow",
      fillColor: "yellow",
      fillOpacity: 0.3,
    }).addTo(map);

    lethalCircle.bindTooltip(
      "Red Zone - Impact Crater<br/>Yellow Zone - Death Radius",
      {
        permanent: false,
        direction: "top",
        className: "tooltip-death",
      },
    );

    map.addEventListener("click", (e: any) => {
      const { lat, lng } = e.latlng;
      $controls.latitude = lat;
      $controls.longitude = lng;

      // Oculta el tooltip después del primer clic
      mounted = true;
    });

    setTimeout(() => map.invalidateSize(), 0);
  });

  // Actualiza las zonas cuando cambia el control (y después del mount)
  $: if (mounted) {
    const lat = $controls.latitude ?? 0;
    const lng = $controls.longitude ?? 0;
    const radiusKm = calculateImpactRadiusKm($controls);

    impactCircle.setLatLng([lat, lng]);
    impactCircle.setRadius(radiusKm * 1000);

    const lethalRadiusKm = calculateLethalRadiusKm($controls);

    lethalCircle.setLatLng([lat, lng]);
    lethalCircle.setRadius(lethalRadiusKm * 1000);
  }
</script>

<!-- Estilos de Leaflet -->
<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin=""
/>

<!-- Contenedor del mapa -->
<div bind:this={mapContainer} class="map"></div>

<!-- Tooltip flotante que desaparece después del clic -->
<div class="map-tooltip" class:hide-tooltip={mounted}>
  Left-click on the map to pinpoint an impact location.
</div>

<style>
  .map {
    height: 90vh;
    width: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
    position: relative;
  }

  .map-tooltip {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-size: 1rem;
    z-index: 1000;
    pointer-events: none;
    transition: opacity 0.5s ease-in-out;
  }

  .hide-tooltip {
    opacity: 0;
    visibility: hidden;
  }
</style>
