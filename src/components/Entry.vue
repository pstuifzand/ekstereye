<template>
  <div>
    <div :class="classes" @click="markRead">
      <div class="card-image" v-if="photo_first">
        <figure class="image">
          <img :src="photo_first"/>
        </figure>
      </div>

      <div class="card-content">
        <div class="media">
          <div class="media-left">
            <figure class="image is-48x48">
              <img :src="author_photo"/>
            </figure>
          </div>

          <div v-if="isRef">
            <div><a :href="author_url">{{ author_name }}</a> reposted:</div>
            <Entry :item="innerRef" :isMainEntry="false"></Entry>
          </div>

          <div class="content" v-else>
            <div><a :href="author_url">{{ author_name }}</a></div>
            <h3 class="title is-6" v-if="item.name" v-text="item.name"></h3>
            <div class="content" v-html="main_content"></div>

            <div class="photos">
              <div class="photo" v-for="photo in photo_rest" :key="photo">
                <img :src="photo" class="image"/>
              </div>
            </div>

            <a :href="item.url" target="_new">
              <span class="published" v-html="item.published"></span>
            </a>
          </div>
        </div>
      </div>
      <footer class="card-footer" v-if="showFooterButtons">
        <a class="card-footer-item" @click.prevent="debug">Debug</a>
        <a class="card-footer-item" @click.prevent="like">Like</a>
        <a class="card-footer-item" @click.prevent="repost">Repost</a>
        <a class="card-footer-item" @click.prevent="openReply">Reply</a>
      </footer>
    </div>
    <div class="card" v-if="replying">
      <div class="card-content">
        <textarea class="textarea" v-model="replyText"></textarea>
      </div>
      <footer class="card-footer">
        <a class="card-footer-item" @click="reply">Reply</a>
      </footer>
    </div>
  </div>
</template>

<script>
  export default {
    name: "Entry",
    props: ['item', 'is-main-entry'],

    data() {
      return {
        'replying': false,
        'replyText': '',
        'showFooterButtons': true
      }
    },

    methods: {
      debug() {
        this.$emit('debug', this.item)
      },
      openReply() {
        this.replying = true
      },
      markRead() {
        this.$emit('markRead', this.item)
      },
      reply() {
        this.$store.dispatch('micropubPost', {
          'type': ['h-entry'],
          'properties': {
            'in-reply-to': [this.item.url],
            'content': [this.replyText]
          },
        }).then(() => {
          this.replyText = '';
          this.replying = false
        })
      },
      like() {
        this.$store.dispatch('micropubPost', {
          'type': ['h-entry'],
          'properties': {
            'like-of': [this.item.url]
          },
        })
      },
      repost() {
        this.$store.dispatch('micropubPost', {
          'type': ['h-entry'],
          'properties': {
            'repost-of': [this.item.url]
          },
        })
      },
      hasRef(key) {
        if (this.item.hasOwnProperty(key) && this.item.hasOwnProperty('refs')) {
          if (this.item.refs.hasOwnProperty(this.item[key])) {
            return true
          }
        }
        return false
      },
    },

    mounted() {
      this.showFooterButtons = this.isMainEntry
    },

    computed: {
      classes() {
        return {
          'entry': true,
          'card': true,
          'mb-20': this.isMainEntry,
          'unread': this.isMainEntry && !this.item._is_read
        }
      },
      innerRef() {
        if (this.isLike) {
          return this.item.refs[this.item['like-of']]
        } else if (this.isRepost) {
          return this.item.refs[this.item['repost-of']]
        }
      },
      isRef() {
        return this.isLike || this.isRepost
      },
      isLike() {
        return this.hasRef('like-of')
      },
      isRepost() {
        return this.hasRef('repost-of')
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
        if (!this.item.author) {
          return 'anonymouse';
        }
        if (!this.item.author.name) {
          if (this.item.author.url) {
            return new URL(this.item.author.url).hostname
          }
        }
        return this.item.author.name
      },
      author_url() {
        if (!this.item.author) {
          return '';
        }
        if (!this.item.author.url) {
          return '';
        }
        return this.item.author.url
      },
      author_photo() {
        if (!this.item.author) {
          return '';
        }
        if (!this.item.author.photo) {
          return '';
        }
        return this.item.author.photo
      }
    }
  }
</script>

<style scoped>
  .entry.unread {
    border: 1px solid #ccc;
    border-radius: 3px;
  }
  .unread {
    box-shadow: 0 4px 8px 0 rgba(255, 255, 0, 0.8), 0 6px 20px 0 rgba(255, 255, 0, 0.5);
  }
  .media .entry {
    margin-top: 0.75rem;
  }
  .media .entry .media {
    margin-top: 0;
  }

  .photos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 4px;
  }
</style>