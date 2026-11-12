<template>
  <div>
    <div v-for="(target, i) in targets" :key="i" style="display: inline-block; margin: 0 3px 3px 0">
      <label>
        <input type="checkbox" class="cb-target" v-model="selected" :value="target.uid"/>
        <span class="tag is-light" v-text="target.name"></span>
      </label>
    </div>
  </div>
</template>
<script>
export default {
  name: 'destination-buttons',
  data() {
    return {
      selected: [],
    }
  },
  props: {
    value: [],
    targets: {}
  },
  mounted() {
    this.selected = this.value
  },
  watch: {
    selected(newSelection) {
      this.$emit('input', newSelection)
    }
  }
}
</script>
<style scoped>
.tag {
  cursor: pointer;
  background: var(--button-bg, #fff);
  border: 1px solid var(--button-border, #dbdbdb);
  color: var(--fg, #363636);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: .8rem;
  user-select: none;
}

.tag:hover {
  border-color: var(--muted, #7a7a7a);
}

.cb-target:checked + .tag {
  background: var(--accent, #5757e8);
  border-color: var(--accent, #5757e8);
  color: var(--accent-fg, #fff);
}

.cb-target { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.cb-target:focus-visible + .tag {
  outline: 2px solid var(--accent, #5757e8);
  outline-offset: 2px;
}
</style>
