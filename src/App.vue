<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-root">
    <RouterView />
  </div>
</template>

<style>
:root {
  --bg-page: #f5f2ee;
  --card-bg: #fff;
  --text-primary: #1a1a1a;
  --text-muted: #6b6b6b;
  --track-bg: #e8e4df;
  --accent: #d97706;
  --accent-subtle: rgba(217, 119, 6, 0.12);
  --error: #c53030;
  --status-ok: rgba(34, 197, 94, 0.2);
  --status-ok-text: #15803d;
  --status-warn: rgba(234, 179, 8, 0.25);
  --status-warn-text: #a16207;
  --status-danger: rgba(220, 38, 38, 0.15);
  --status-danger-text: #b91c1c;
}

html, body, #app, .app-root {
  height: 100%;
  margin: 0;
}
</style>
