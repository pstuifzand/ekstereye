<template>
  <div :class="modalClasses">
    <div class="modal-background"></div>
    <div class="modal-card search-card" role="dialog" aria-modal="true" aria-labelledby="search-title">
      <header class="search-header">
        <div><h2 id="search-title">Search</h2><p>Find items in your feeds.</p></div>
        <button type="button" class="close-button" aria-label="Close" title="Close" @click="close">×</button>
      </header>
      <div class="search-body">
        <div class="field has-addons">
          <div class="control is-expanded">
            <input type="search" class="input is-expanded" id="search-query" aria-label="Search for items" placeholder="Search for items" v-model="query" ref="query" @keypress.enter="search"/>
            <span class="error" role="alert" v-text="error"></span>
          </div>
          <div class="control">
            <button :class="searchClasses" @click="search">Search</button>
          </div>
        </div>

        <fieldset class="search-scope">
          <legend>Search in</legend>
          <label for="global" class="radio"><input type="radio" name="channel" id="global" value="global" v-model="searchChannel"> All feeds</label>
          <label for="channel" class="radio"><input type="radio" name="channel" id="channel" value="channel" v-model="searchChannel"> Current channel</label>
        </fieldset>

        <div class="timeline--item" v-for="item in searchItems" :key="item._id">
          <TimelineEntry :item="item" :is-main-entry="true" @debug="debug" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TimelineEntry from '../components/Entry'
import modalA11y from '@/modal-a11y'

export default {
  name: "SearchPopup",
  mixins: [modalA11y],
  modalCloseAction: 'closeSearch',
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

<style scoped>
.search-card { width: min(40rem, 94vw); max-height: 88vh; border: 1px solid var(--button-border); border-radius: 10px; background: var(--card); box-shadow: 0 20px 60px #0006; overflow: hidden; }
.search-header { display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px 18px; border-bottom: 1px solid var(--line); }
.search-header h2 { margin: 0; color: var(--fg); font-size: 1.1rem; font-weight: 650; letter-spacing: -.02em; }
.search-header p { margin: 4px 0 0; color: var(--muted); font-size: .8rem; }
.close-button { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 1.3rem; cursor: pointer; }
.close-button:hover { color: var(--fg); background: var(--hover-bg); }
.search-body { flex: 1 1 auto; overflow-y: auto; padding: 20px 24px 24px; }
.search-body .input { background: var(--button-bg); border-color: var(--button-border); color: var(--fg); }
.search-body .input::placeholder { color: var(--muted); opacity: 1; }
.search-body .input:focus { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.search-body .button.is-primary { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
.search-scope { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin: 20px 0 24px; padding: 0; border: 0; color: var(--muted); font-size: .8rem; }
.search-scope legend { float: left; margin-right: 16px; color: var(--muted); font-weight: 600; }
.search-scope .radio { margin: 0; color: var(--fg); }
.search-scope input { accent-color: var(--accent); margin-right: 4px; }
.error { display: block; color: #f29b9b; font-size: .8rem; }
.timeline--item { margin-top: 12px; }
@media (max-width: 500px) { .search-header, .search-body { padding-left: 18px; padding-right: 18px; } }
</style>
