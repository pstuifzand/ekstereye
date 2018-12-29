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
  export default {
    name: "NewPost",
    data() {
      return {
        newPost: '',
        tags: [{name:"twitter"},{name:"instagram"}]
      }
    },
    methods: {
      post() {
        this.$store.dispatch('micropubPost', {
          'type': ['h-entry'],
          'properties': {
            'content': [this.newPost]
          },
        }).then(() => {
          this.newPost = '';
          this.$emit('close')
        })
      },
    }
  }
</script>

<style scoped>

</style>