<template>
  <div>
    <input type="text" class="input" v-model="categories">
  </div>
</template>

<script>
export default {
  name: "EntryCategories",
  props: {
    'value': {
      type: Array,
      default: []
    }
  },

  data() {
    return {
      categories: ''
    }
  },

  mounted() {
    this.categories = this.value.join(" ")
  },

  watch: {
    categories() {
      let words = this.categories.split(/\s+/).filter(value => value.length !== 0)
      this.$emit('input', words)
    }
  }
}
</script>

<style scoped>

</style>