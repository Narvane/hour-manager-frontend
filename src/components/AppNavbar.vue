<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const menuOpen = ref(false)

function go(to: string) {
  menuOpen.value = false
  router.push(to)
}

function closeMenu() {
  menuOpen.value = false
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.navbar') && menuOpen.value) menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <nav class="navbar">
    <router-link to="/" class="navbar-brand">Work Hours</router-link>
    <div class="navbar-actions">
      <button
        type="button"
        class="navbar-menu-btn"
        :class="{ 'navbar-menu-btn--open': menuOpen }"
        aria-haspopup="true"
        :aria-expanded="menuOpen"
        @click.stop="menuOpen = !menuOpen"
      >
        <span class="navbar-menu-icon" aria-hidden="true">⋮</span>
        <span class="sr-only">Menu</span>
      </button>
      <div v-show="menuOpen" class="navbar-dropdown" role="menu">
        <button type="button" role="menuitem" class="navbar-dropdown-item" @click="go('/history')">
          Histórico de registro de horas
        </button>
        <button type="button" role="menuitem" class="navbar-dropdown-item" @click="go('/settings')">
          Configurações de trabalho
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 1.25rem;
  background: var(--card-bg, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 100;
  font-family: 'DM Sans', system-ui, sans-serif;
}

.navbar-brand {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
  text-decoration: none;
  letter-spacing: -0.02em;
}

.navbar-brand:hover {
  color: var(--accent, #d97706);
}

.navbar-actions {
  position: relative;
}

.navbar-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, #6b6b6b);
  cursor: pointer;
  font-size: 1.25rem;
  font-family: 'DM Sans', system-ui, sans-serif;
  transition: background 0.15s, color 0.15s;
}

.navbar-menu-btn:hover {
  background: var(--bg-page, #f5f2ee);
  color: var(--text-primary, #1a1a1a);
}

.navbar-menu-btn--open {
  background: var(--accent-subtle, rgba(217, 119, 6, 0.12));
  color: var(--accent, #d97706);
}

.navbar-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 240px;
  padding: 0.5rem 0;
  background: var(--card-bg, #fff);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.06);
  font-family: 'DM Sans', system-ui, sans-serif;
}

.navbar-dropdown-item {
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  border: none;
  background: none;
  font-size: 0.9rem;
  color: var(--text-primary, #1a1a1a);
  text-align: left;
  cursor: pointer;
  font-family: 'DM Sans', system-ui, sans-serif;
  transition: background 0.15s;
}

.navbar-dropdown-item:hover {
  background: var(--bg-page, #f5f2ee);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
