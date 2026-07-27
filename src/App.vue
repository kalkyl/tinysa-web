<script setup lang="ts">
import ConnectionPanel from './components/ConnectionPanel.vue'
import SweepControls from './components/SweepControls.vue'
import CalibrationControl from './components/CalibrationControl.vue'
import PeakHoldControls from './components/PeakHoldControls.vue'
import AveragingControls from './components/AveragingControls.vue'
import NoiseFloorControls from './components/NoiseFloorControls.vue'
import MarkerReadout from './components/MarkerReadout.vue'
import PlotCanvas from './components/PlotCanvas.vue'
import DisplayOptions from './components/DisplayOptions.vue'
import ReferenceLinesPanel from './components/ReferenceLinesPanel.vue'
import MeasurementsPanel from './components/MeasurementsPanel.vue'
</script>

<template>
  <div id="app">
    <ConnectionPanel />
    <div class="sweep-row">
      <SweepControls />
    </div>
    <div class="side-controls">
      <CalibrationControl />
      <PeakHoldControls />
      <AveragingControls />
      <NoiseFloorControls />
      <MarkerReadout />
    </div>
    <div class="main-row">
      <main class="plot-area">
        <PlotCanvas />
        <DisplayOptions />
      </main>
      <aside class="side-panel">
        <ReferenceLinesPanel />
        <MeasurementsPanel />
      </aside>
    </div>
  </div>
</template>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.sweep-row {
  padding: 0.75rem 1rem 0;
}
.side-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.75rem 1rem 0;
}
.main-row {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1rem 1rem;
}
.plot-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.plot-area > :first-child {
  flex: 1;
  min-height: 0;
}
.side-panel {
  width: 22rem;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
