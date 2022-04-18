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
            <span class="error" v-text="error"></span>
          </div>
          <div class="control">
            <button :class="searchClasses" @click="search">Search</button>
          </div>
        </div>

        <div class="field">
          <div class="control">
            <label for="global" class="radio"><input type="radio" name="channel" id="global" value="global" v-model="searchChannel"> Global</label>
            <label for="channel" class="radio"><input type="radio" name="channel" id="channel" value="channel" v-model="searchChannel"> Channel</label>
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
      query: '',
      loading: false,
      error: '',
      searchChannel: 'global'
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
      this.loading = true
      this.error = ''
      this.$store.dispatch('startQuery', {query: this.query, channel: this.searchChannel})
        .then(result => {
          this.loading = false
          if (result.error) {
            this.error = result.error
          } else {
            this.error = ''
          }
        })
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
