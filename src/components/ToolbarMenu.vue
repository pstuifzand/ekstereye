<template>
  <div class="toolbar-menu" ref="root" @keydown="onKeydown">
    <button ref="trigger" type="button" class="toolbar-button toolbar-ghost toolbar-icon-button" :aria-label="label" :title="label" aria-haspopup="menu" :aria-expanded="open ? 'true' : 'false'" @click="open = !open" @keydown.down.prevent="showAndFocus">
      <slot name="trigger" />
    </button>
    <div v-if="open" ref="menu" class="toolbar-popover" role="menu" :aria-label="label" @click="onMenuClick">
      <slot />
    </div>
  </div>
</template>
<script>
export default {
  name: 'ToolbarMenu',
  props: { label: { type: String, required: true } },
  data() { return { open: false } },
  mounted() { document.addEventListener('pointerdown', this.onOutside) },
  beforeDestroy() { document.removeEventListener('pointerdown', this.onOutside) },
  methods: {
    onOutside(event) { if (this.$refs.root && !this.$refs.root.contains(event.target)) this.open = false },
    showAndFocus() { this.open = true; this.$nextTick(() => { const first = this.$refs.menu && this.$refs.menu.querySelector('[role="menuitem"], [role="menuitemradio"]'); if (first) first.focus() }) },
    onMenuClick(event) { if (event.target.closest('[role="menuitem"], [role="menuitemradio"]')) this.open = false },
    onKeydown(event) {
      if (!this.open) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.open = false; this.$refs.trigger.focus(); return }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      const items = [...this.$refs.menu.querySelectorAll('[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)')]
      if (!items.length) return
      event.preventDefault()
      const index = items.indexOf(document.activeElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[next].focus()
    }
  }
}
</script>
