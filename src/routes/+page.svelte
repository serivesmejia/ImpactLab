<script lang="ts">
    import ControllerSidebar from "./ControllerSidebar.svelte";
    import EarthMap from "./visualizers/EarthMap.svelte";
    import Orbits from "./visualizers/Orbits.svelte";

    import type { Controls } from "./controls";
    import { Tabs, TabItem } from "flowbite-svelte";
    import { writable, type Writable } from "svelte/store";

    const controls: Writable<Controls> = writable({
        yearsPerSec: 0.05,
        shooting: false,
        size: 5,       // km
        distance: 10000, // km
        velocity: 10,    // km/s
        latitude: 28.5,     // degrees
        longitude: -106     // degrees
    });

    // Estado para el sidebar
    const sidebarOpen = writable(true);

    function toggleSidebar() {
        sidebarOpen.update((v) => !v);
    }
</script>

<div class="app-container">
    <!-- Sidebar colapsable -->
    <aside class="sidebar" class:collapsed={!$sidebarOpen}>
        <div class="sidebar-inner" class:hide-content={!$sidebarOpen}>
            <ControllerSidebar {controls} />
        </div>
    </aside>

    <!-- Botón flotante -->
    <button class="toggle-btn" on:click={toggleSidebar}>
        {#if $sidebarOpen} ← {:else} → {/if}
    </button>

    <!-- Contenido principal -->
    <main class="main-content">
        <div class="tabs-wrapper">
            <Tabs style="underline" class="tabs-stretch">
                <TabItem open title="3D Orbit" class="tab-item">
                    <div class="tab-content">
                        <Orbits {controls} />
                    </div>
                </TabItem>

                <TabItem title="Earth Map" class="tab-item">
                    <div class="tab-content">
                        <EarthMap {controls} />
                    </div>
                </TabItem>
            </Tabs>
        </div>
    </main>
</div>

<style>
	:root {
		--sidebar-width: 16rem;
	}

	html,
	body {
		height: 100%;
		margin: 0;
	}

	.app-container {
		display: flex;
		height: 100vh;
		background-color: #1e293b;
		color: white;
		position: relative; /* para que el botón absoluto funcione */
	}

	/* Sidebar */
	.sidebar {
		flex: none;
		width: var(--sidebar-width); /* Usando la variable CSS */
		display: flex;
		flex-direction: column;
		transition: width 0.3s ease-in-out;
		overflow: hidden;
		background-color: #1f2937; /* slate-800 */
	}

	.sidebar.collapsed {
		width: 0;
	}

	/* Contenido interno del sidebar */
	.sidebar-inner {
		flex: 1;
		display: flex;
		flex-direction: column;
		transition: opacity 0.3s;
	}

	.hide-content {
		display: none;
	}

	/* Botón al borde derecho flotante */
	.toggle-btn {
		position: absolute;
		top: 50%;
		left: var(--sidebar-width); /* Usando la variable CSS */
		transform: translateY(-50%);
		background-color: #1f2937;
		color: #e5e7eb;
		cursor: pointer;
		width: 2.5rem; /* Ajuste de tamaño */
		height: 4rem; /* Ajuste de tamaño */
		font-size: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;

		/* --- CAMBIOS PRINCIPALES AQUÍ --- */
		border-left: none; /* Quitamos el borde izquierdo */
		border-top-left-radius: 0; /* Quitamos redondeo de esquina */
		border-bottom-left-radius: 0; /* Quitamos redondeo de esquina */
		border-top-right-radius: 0.5rem; /* Mantenemos redondeo */
		border-bottom-right-radius: 0.5rem; /* Mantenemos redondeo */

		/* Transiciones */
		transition:
			transform 0.2s,
			left 0.3s ease-in-out;

		/* Origen de la transformación para el hover */
		transform-origin: left center;
	}

	/* Cuando el sidebar está colapsado, movemos el botón */
	.sidebar.collapsed + .toggle-btn {
		left: 0;
	}

	.toggle-btn:hover {
		transform: translateY(-50%) scale(1.1); /* Efecto de escala */
	}

	/* Contenido principal */
	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* El resto de los estilos se mantienen igual */
	.tabs-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.tab-item {
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

	.visualizer {
		flex: 1;
		width: 100%;
		height: 100%;
	}
</style>