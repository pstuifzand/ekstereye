<template>
  <div class="modal is-active">
    <div class="modal-background" @click="requestClose"></div>
    <div class="modal-card composer" role="dialog" aria-modal="true" aria-labelledby="composer-title">
    <div class="composer-header">
      <h2 id="composer-title">New post</h2><button type="button" class="composer-close" aria-label="Close new post" @click="requestClose">×</button>
    </div>
    <div class="composer-body">
      <div class="media">
        <div class="media-content">
          <div class="field">
            <div class="control">
              <label class="label" for="new-post-content">Post</label><textarea id="new-post-content" ref="postContent" class="textarea" v-model="newPost" placeholder="What would you like to share?"></textarea>
            </div>
          </div>
          <div class="field">
            <label class="label" for="new-post-categories">Categories</label><entry-categories id="new-post-categories" v-model="categories" />
          </div>
          <div v-if="targets && Object.keys(targets).length" class="field">
            <div class="label">Syndication</div>
            <syndication-buttons v-model="selectedTargets" :targets="targets"/>
          </div>
          <div v-if="destinations && Object.keys(destinations).length" class="field">
            <div class="label">Destinations</div>
            <destination-buttons v-model="selectedDestinations" :targets="destinations"/>
          </div>
          <div class="level">
            <div class="level-left">
              <div class="level-item">
                <div class="field">
                  <div class="control">
                    <button type="button" class="button is-primary" :disabled="posting" @click="post">{{ posting ? 'Posting…' : 'Post' }}</button>
                    <button type="button" class="button composer-cancel" :disabled="posting" @click="requestClose">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="level-right">
              <div class="level-item">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script>
  import modalA11y from '@/modal-a11y';
  import DestinationButtons from "@/components/DestinationButtons";
  import EntryCategories from "@/components/EntryCategories";
  import SyndicationButtons from "@/components/SyndicationButtons";

  export default {
    name: "NewPost",
    mixins: [modalA11y],
    props: { isOpen: { type: Boolean, default: true } },
    components:{
      DestinationButtons,
      EntryCategories,
      SyndicationButtons,
    },
    data() {
      return {
        newPost: '',
        posting: false,
        targets: [],
        selectedTargets: [],
        destinations: [],
        selectedDestinations: [],
        categories: []
      }
    },
    mounted() {
      this.$store.dispatch('fetchSyndicationTargets')
          .then(res => this.targets = res['syndicate-to'])
      this.$store.dispatch('fetchDestinations')
          .then(res => this.destinations = res['destination'])
    },
    methods: {
      focusFirstInModal() { if (this.$refs.postContent) this.$refs.postContent.focus() },
      dismissModal() { this.requestClose() },
      requestClose() {
        if (this.posting) return
        const dirty = this.newPost.trim() || this.categories.length || this.selectedTargets.length || this.selectedDestinations.length
        if (dirty && !window.confirm('Discard your unsent post?')) return
        this.$emit('close')
      },
      post() {
        if (this.posting) return
        this.posting = true
        this.$store.dispatch('micropubPost', {
          post: {
            'type': ['h-entry'],
            'properties': {
              'content': [this.newPost],
              'category': this.categories,
              'mp-syndicate-to': this.selectedTargets,
              'mp-destination': this.selectedDestinations,
            },
          },
          success: 'Posted',
          failure: 'Post failed'
        }).then(() => {
          this.posting = false
          this.newPost = ''
          this.categories = []
          this.selectedTargets = []
          this.selectedDestinations = []
          this.$emit('close')
        }).catch(() => { this.posting = false })
      },
    }
  }
</script>

<style scoped>
.composer { width: min(38rem, 94vw); max-height: 88vh; border: 1px solid var(--button-border); border-radius: 10px; background: var(--card); box-shadow: 0 20px 60px #0006; overflow: hidden; }
.composer-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--line); }
.composer-header h2 { font-size: .95rem; font-weight: 650; margin: 0; color: var(--fg); }
.composer-close { width: 30px; height: 30px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 1.3rem; cursor: pointer; }
.composer-close:hover { background: var(--hover-bg); color: var(--fg); }
.composer-body { padding: 20px; overflow-y: auto; }
.composer .label { color: var(--muted); font-size: .8rem; }
.composer-cancel { margin-left: 8px; }
</style>