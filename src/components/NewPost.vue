<template>
  <div class="card composer">
    <div class="composer-header">
      <h2>New post</h2><button type="button" class="composer-close" aria-label="Close new post" @click="$emit('close')">×</button>
    </div>
    <div class="card-content">
      <div class="media">
        <div class="media-content">
          <div class="field">
            <div class="control">
              <label class="label" for="new-post-content">Post</label><textarea id="new-post-content" class="textarea" v-model="newPost" placeholder="What would you like to share?"></textarea>
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
                    <button class="button is-primary" @click="post">Post</button>
                    <button type="button" class="button composer-cancel" @click="$emit('close')">Cancel</button>
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
</template>

<script>
  import DestinationButtons from "@/components/DestinationButtons";
  import EntryCategories from "@/components/EntryCategories";
  import SyndicationButtons from "@/components/SyndicationButtons";

  export default {
    name: "NewPost",
    components:{
      DestinationButtons,
      EntryCategories,
      SyndicationButtons,
    },
    data() {
      return {
        newPost: '',
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
      post() {
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
          this.newPost = ''
          this.categories = []
          this.selectedTargets = []
          this.selectedDestinations = []
          this.$emit('close')
        }).catch(() => {})
      },
    }
  }
</script>

<style scoped>
.composer { max-width: 760px; border: 1px solid var(--line); border-radius: 9px; box-shadow: none; overflow: hidden; }
.composer-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--line); }
.composer-header h2 { font-size: .95rem; font-weight: 650; margin: 0; color: var(--fg); }
.composer-close { width: 30px; height: 30px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 1.3rem; cursor: pointer; }
.composer-close:hover { background: var(--hover-bg); color: var(--fg); }
.composer .card-content { padding: 20px; }
.composer .label { color: var(--muted); font-size: .8rem; }
.composer-cancel { margin-left: 8px; }
</style>