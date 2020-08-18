<template>
  <div class="card">
    <div class="card-header">
      <div class="card-header-title">What are you thinking about?</div>
    </div>
    <div class="card-content">
      <div class="media">
        <div class="media-content">
          <div class="field">
            <div class="control">
              <textarea class="textarea" v-model="newPost"></textarea>
            </div>
          </div>
          <div class="field">
            Categories: <entry-categories v-model="categories" />
          </div>
          <div class="field">
            Syndication:
            <syndication-buttons v-model="selectedTargets" :targets="targets"/>
          </div>
          <div class="field">
            Destinations:
            <destination-buttons v-model="selectedDestinations" :targets="destinations"/>
          </div>
          <div class="level">
            <div class="level-left">
              <div class="level-item">
                <div class="field">
                  <div class="control">
                    <button class="button is-primary" @click="post">Post</button>
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
          'type': ['h-entry'],
          'properties': {
            'content': [this.newPost],
            'category': this.categories,
            'mp-syndicate-to': this.selectedTargets,
            'mp-destination': this.selectedDestinations,
          },
        }).then(() => {
          this.newPost = ''
          this.categories = []
          this.selectedTargets = []
          this.selectedDestinations = []
          this.$emit('close')
        })
      },
    }
  }
</script>

<style scoped>

</style>