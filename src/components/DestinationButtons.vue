<template>
  <div>
    <div v-for="(target, i) in targets" :key="i" style="display: inline-block; margin: 0 3px 3px 0">
      <label>
        <input type="checkbox" class="is-hidden cb-target" v-model="selected" :value="target.uid"/>
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
}

.cb-target:checked + .tag {
  background-color: #23d160;
  color: #fff;
}
</style>