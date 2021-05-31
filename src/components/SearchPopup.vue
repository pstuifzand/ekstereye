<template>
  <div :class="modalClasses">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Search</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <div class="modal-card-body">
        <div class="field has-addons">
          <div class="control is-expanded">
            <input type="text" class="input is-expanded" id="query" placeholder="Search for items" v-model="query" ref="query" @keypress.enter="search"/>
          </div>
          <div class="control">
            <button :class="searchClasses" @click="search">Search</button>
          </div>
        </div>
        
        <div class="timeline--item" v-for="item in searchItems" :key="item.id">
          <TimelineEntry :item="item" :is-main-entry="true" @debug="debug" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TimelineEntry from '../components/Entry'

export default {
  name: "SearchPopup",
  components: {
    TimelineEntry
  },
  props: ['is-open'],
  data() {
    return {
      query: ''
    }
  },
  mounted () {
  },
  watch: {
    isOpen(val) {
      if (val) {
        this.$nextTick(() => this.$refs.query.focus())
      }
    }
  },
  computed: {
    modalClasses() {
      return {'modal': true, 'is-active': this.isOpen}
    },
    searchItems () {
      return this.$store.state.searchItems
    },
    searchClasses() {
      return {'button': true, 'is-primary': true, 'is-loading': this.loading}
    },
  },
  methods: {
    search () {
      this.$store.dispatch('startQuery', this.query)
    },
    close () {
      this.$store.dispatch('closeSearch')
      this.query = ''
    },
    debug (item) {
      this.$store.dispatch('openDebug', item)
    }
  }
}
</script>

<style>
</style>
