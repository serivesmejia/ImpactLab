<script>
    const controls = {
        open: false
    }
</script>

<div class="flex h-screen bg-gray-100">
  <!-- Sidebar -->
  <aside class="w-64 bg-gray-800 text-white p-4 flex-shrink-0">
    <h2 class="text-xl font-bold mb-4">Impact Parameters</h2>
    <div class="space-y-4">
      <div>
        <label class="block mb-1">Asteroid Size (km)</label>
        <input type="number" class="w-full p-2 rounded text-black"/>
      </div>
      <div>
        <label class="block mb-1">Velocity (km/s)</label>
        <input type="number" class="w-full p-2 rounded text-black"/>
      </div>
      <div>
        <label class="block mb-1">Impact Angle (°)</label>
        <input type="number" class="w-full p-2 rounded text-black"/>
      </div>
    </div>
  </aside>
</div>