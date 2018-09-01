<template>
  <div class="result">
    <div class="image is-48x48"><img :src="feed.photo" alt="" class="feed-icon"/></div>
    <div class="feed-name" v-text="feed.name"></div>
    <button :class="buttonClasses" @click="showFeed">Show feed</button>
    <button :class="buttonClasses" @click="addFeed">Add feed</button>
  </div>
</template>
<script>
  export default {
    name: 'feed-chooser',
    props: ['feed'],

    computed: {
      buttonClasses() {
        return {'button': true, 'is-loading': this.feed.loading}
      }
    },

    methods: {
      showFeed(feed) {
        this.$emit('showFeed', feed)
      },
      addFeed(feed) {
        this.$emit('addFeed', feed)
      }
    }

  }
</script>
<style scoped>
  .result {
    display:contents;
    margin-top: 6px;
    width: 100%;
    /*display: flex;*/
    /*flex-direction: row;*/
    /*justify-content: space-between;*/
    border: 1px solid #eee;
    padding: 6px;
  }
  .result > * {
    align-self: center;
  }
</style>