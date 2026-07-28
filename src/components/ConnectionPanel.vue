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

    <a
      class="github-link"
      href="https://github.com/kalkyl/tinysa-web"
      target="_blank"
      rel="noopener noreferrer"
      title="View source on GitHub"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
        />
      </svg>
      GitHub
    </a>
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
.github-link {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--muted-ink);
  text-decoration: none;
}
.github-link:hover {
  color: var(--secondary-ink);
  text-decoration: underline;
}
</style>
