<script setup lang="ts">
import { computed } from 'vue'
import { useSerialPort } from '../composables/useSerialPort'
import { useDeviceCapabilities } from '../composables/useDeviceCapabilities'

const { state, errorMessage, connect, disconnect } = useSerialPort()
const { displayName, firmwareVersion } = useDeviceCapabilities()

const webSerialSupported = typeof navigator !== 'undefined' && 'serial' in navigator

const statusLabel = computed(() => {
  switch (state.value) {
    case 'idle':
      return 'Not connected'
    case 'connecting':
      return 'Connecting…'
    case 'connected':
      return `Connected — ${displayName.value}`
    case 'disconnected':
      return 'Device disconnected'
    case 'error':
      return 'Connection error'
  }
  return ''
})

async function handleConnect(): Promise<void> {
  try {
    await connect()
  } catch {
    // errorMessage is already set by useSerialPort; nothing else to do here.
  }
}
</script>

<template>
  <section class="connection-panel">
    <div class="actions">
      <button
        v-if="state !== 'connected'"
        class="primary"
        :disabled="!webSerialSupported || state === 'connecting'"
        @click="handleConnect"
      >
        Connect tinySA…
      </button>
      <button v-else @click="disconnect">Disconnect</button>
    </div>

    <div class="status" :class="state">
      {{ statusLabel }}
      <span v-if="state === 'connected' && firmwareVersion" class="firmware">{{ firmwareVersion }}</span>
    </div>

    <p v-if="!webSerialSupported" class="warning">
      Web Serial isn't available in this browser. Use Chrome, Edge, or Opera, served over https or localhost.
    </p>
    <p v-if="errorMessage" class="warning">{{ errorMessage }}</p>
  </section>
</template>

<style scoped>
.connection-panel {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--gridline);
}
.status {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.status.error {
  color: var(--error-ink);
}
.firmware {
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--muted-ink);
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.warning {
  color: var(--error-ink);
  font-size: 0.875rem;
  margin: 0;
}
</style>
