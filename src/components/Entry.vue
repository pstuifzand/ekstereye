<template>
  <div :class="classes">
    <div class="card-image" v-if="photo_first">
      <figure class="image">
        <img :src="photo_first"/>
      </figure>
    </div>

    <div class="card-content">
      <div class="media">
        <div class="media-left">
          <figure class="image is-48x48">
            <img :src="item.author.photo"/>
          </figure>
        </div>

        <div class="content">
          <div><a :href="author_url">{{ author_name }}</a></div>
          <h3 class="title is-6" v-if="item.name" v-text="item.name"></h3>
          <div class="content" v-html="main_content"></div>

          <div class="photos">
            <div class="photo" v-for="photo in photo_rest" :key="photo">
              <img :src="photo" class="image"/>
            </div>
          </div>

          <div class="debug" v-text="item" v-if="this.$store.state.debug"></div>

          <a :href="item.url" target="_new">
            <span class="published" v-html="item.published"></span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "Entry",
    props: ['item'],

    computed: {
      classes() {
        return {'entry': true, 'card': true, 'unread': !this.item._is_read}
      },
      main_content() {
        let content = this.item.content
        if (content) {
          if (content.html) {
            return content.html
          } else if (content.text) {
            return content.text
          }
          return content
        }
        content = this.item.summary
        if (content) {
          if (content.html) {
            return content.html
          } else if (content.text) {
            return content.text
          }
          return content
        }
      },
      photo_first() {
        if (this.item.photo && this.item.photo.length >= 1) {
          return this.item.photo[0]
        }
        return false
      },
      photo_rest() {
        if (this.item.photo && this.item.photo.length > 1) {
          return this.item.photo.slice(1)
        }
        return []
      },
      author_name() {
        if (!this.item.author.name) {
          return new URL(this.item.author.url).hostname
        }
        return this.item.author.name
      },
      author_url() {
        return this.item.author.url
      }
    }
  }
</script>

<style scoped>
  .entry {
    border: 1px solid #ccc;
  }

  .unread {
    box-shadow: 0 4px 8px 0 rgba(255, 255, 0, 0.8), 0 6px 20px 0 rgba(255, 255, 0, 0.5);
  }

  .photos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 4px;
  }
</style>