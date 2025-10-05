<script lang="ts">
  import { onMount } from "svelte";
  import type { Controls } from "./controls";
  import type { Writable } from "svelte/store";
  import type { Map } from "leaflet";

  export let controls: Writable<Controls>; // already a writable

  let mapContainer: HTMLDivElement;
  let map: Map;
  let impactCircle: any;
  let lethalCircle: any;
  let mounted = false; // <-- flag

  function calculateImpactRadiusKm(c: Controls) {
    // D es diámetro del asteroide en km, v en km/s
    const D = c.size ?? 1;
    const v = c.velocity ?? 20;

    // Escala aproximada, basada en modelos simples de impacto
    const radiusKm = 10 * Math.pow(D, 0.78) * Math.pow(v, 0.44);

    return radiusKm;
  }

  function calculateLethalRadiusKm(controls: Controls) {
    const density = 3000; // kg/m³, roca típica
    const radiusM = (controls.size * 1000) / 2; // tamaño en metros
    const volume = (4 / 3) * Math.PI * radiusM ** 3;
    const mass = volume * density; // kg
    const velocityMs = controls.velocity * 1000; // convertir km/s a m/s
    const energyJ = 0.5 * mass * velocityMs ** 2;

    // Escala empírica para círculo fatal
    const k = 0.05; // factor de ajuste visual
    return (Math.cbrt(energyJ) * k) / 1000; // km
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
      "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
      {
        noWrap: true,
        attribution:
          '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(map);

    // Initialize impact circle
    impactCircle = L.circle([0, 0], { radius: 1000, color: "red", weight: 2 });
    impactCircle.addTo(map);

    lethalCircle = L.circle([0, 0], {
      radius: 0 * 1000, // Leaflet in meters
      color: "yellow",
      fillColor: "yellow",
      fillOpacity: 0.3,
    }).addTo(map);

    lethalCircle.bindTooltip("Red Zone - Impact Crater<br/>Yellow Zone - Death Radius", {
      permanent: false,
      direction: "top",
      className: "tooltip-death",
    });

    mounted = true; // <-- mark as ready

    map.addEventListener("click", (e: any) => {
      const { lat, lng } = e.latlng;
      $controls.latitude = lat;
      $controls.longitude = lng;
    });

    setTimeout(() => map.invalidateSize(), 0);
  });

  // Reactive block, runs only after mount
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

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin=""
/>

<div bind:this={mapContainer} class="map"></div>

<style>
  .map {
    height: 90vh;
    width: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
  }
</style>
