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
            <p class="image is-48x48">
              <img :src="author_photo"/>
            </p>
          </div>

          <div ref="content-container" :class="{'content': true, 'content-container': true, 'open': hiddenContentVisible}">
            <div v-if="isRef">
              <div><small><a :href="outside_author_url">{{ outside_author_name }}</a>&nbsp;<span v-text="refText"></span>:</small></div>
            </div>

            <div>
              <div><a :href="author_url">{{ author_name }}</a>
                &middot;
                <a :href="currentItem.url" target="_new"><span class="published" v-html="niceTime"></span></a>
              </div>

              <h3 class="title is-6" v-if="currentItem.name" v-text="currentItem.name"></h3>
              <div class="content" v-html="main_content"></div>

              <div class="photos">
                <div class="photo" v-for="photo in photo_rest" :key="photo">
                  <img :src="photo" class="image"/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="level">
            <div class="level-item">
              <button class="is-link" v-if="hasHiddenContent" @click.prevent="toggleHiddenContent">Read more</button>
            </div>
            <div class="level-item">
                <small>
                <span v-if="showFooterButtons">
                <a @click="like">Like</a>
                &middot; <a @click.prevent="openReply">Reply</a>
                &middot; <a @click.prevent="repost">Repost</a>
                &middot; <a @click.prevent="openBookmark">Bookmark</a>
                &middot; <a @click.prevent="$emit('followFeed', author_url)" title="Try to follow the feed this item comes from">Follow</a>
                &middot; <a @click.prevent="debug">Debug</a>
                </span>
                </small>
            </div>
          </div>
        </div>
        <div class="media" v-if="replying">
          <div class="media-content">
            <div class="field">
              <label class="label">Write your reply:</label>
              <div class="control">
                <textarea class="textarea" v-model="replyText"></textarea>
              </div>
            </div>
            <div class="field">
              <div class="control">
                <button class="button is-primary" @click="reply">Reply</button>
              </div>
            </div>
          </div>
        </div>
        <div class="media" v-if="bookmarking">
          <div class="media-content">
            <div class="field">
              <div class="control">
                <input type="text" class="input" placeholder="Title" v-model="bookmarkTitle">
              </div>
            </div>
            <div class="field">
              <label class="label">Add a note</label>
              <div class="control">
                <textarea class="textarea" v-model="bookmarkDescription"></textarea>
              </div>
            </div>
            <div class="field">
              Categories: <entry-categories v-model="categories"/>
            </div>
            <div class="field">
              Syndication: <syndication-buttons v-model="selected" :targets="targets"/>
            </div>
            <div class="field">
              Destination: <destination-buttons v-model="selectedDestinations" :targets="destinations"/>
            </div>
            <div class="field">
              <div class="control">
                <button class="button is-primary" @click="bookmark">Bookmark</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import DestinationButtons from "@/components/DestinationButtons";
import EntryCategories from "@/components/EntryCategories";
import SyndicationButtons from "@/components/SyndicationButtons";

export default {
    name: "Entry",
    components: {
      DestinationButtons,
      EntryCategories,
      SyndicationButtons
    },
    props: ['item'],

    data() {
      return {
        'replying': false,
        'replyText': '',
        'showFooterButtons': true,
        bookmarking: false,
        bookmarkTitle: '',
        bookmarkDescription: '',
        targets: [],
        selected: [],
        destinations: [],
        selectedDestinations: [],
        categories: [],
        hasHiddenContent: true,
        hiddenContentVisible: false
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
            'in-reply-to': [this.currentItem.url],
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
            'like-of': [this.currentItem.url]
          },
        })
      },
      repost() {
        this.$store.dispatch('micropubPost', {
          'type': ['h-entry'],
          'properties': {
            'repost-of': [this.currentItem.url]
          },
        })
      },
      openBookmark() {
        this.bookmarking = true
        this.bookmarkTitle = this.author_name + ' - ' + this.currentItem.name
        this.bookmarkDescription = ''
        this.selected = []
        this.$store.dispatch('fetchSyndicationTargets')
            .then(res => this.targets = res['syndicate-to'])
        this.$store.dispatch('fetchDestinations')
            .then(res => this.destinations = res['destination'])
      },
      bookmark() {
        this.$store.dispatch('micropubPost', {
          'type': ['h-entry'],
          'properties': {
            'bookmark-of': [this.currentItem.url],
            'name': [this.bookmarkTitle],
            'content': [this.bookmarkDescription ],
            'category': this.categories,
            'mp-syndicate-to': this.selected,
            'mp-destination': this.selectedDestinations
          },
        }).then(() => {
          this.bookmarkTitle = '';
          this.bookmarkDescription = '';
          this.selected = []
          this.selectedDestinations = []
          this.bookmarking = false
          this.categories = []
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
      toggleHiddenContent() {
        this.hiddenContentVisible = !this.hiddenContentVisible
        const el = this.$refs['content-container']
        el.scrollIntoView(true)
      }
    },

    mounted() {
      this.showFooterButtons = true
      const el = this.$refs['content-container']
      this.hasHiddenContent = el.scrollHeight > el.clientHeight
    },

    computed: {
      currentItem() {
        if (this.isRef) {
          return this.innerRef
        } else {
          return this.item
        }
      },
      niceTime() {
        return moment(this.item.published).fromNow()
      },
      refNiceTime() {
        return moment(this.innerRef.published).fromNow()
      },
      classes() {
        return {
          'entry': true,
          'card': true,
          'mb-20': true,
          'unread': !this.item._is_read
        }
      },
      innerRef() {
        if (this.isLike) {
          return this.item.refs[this.item['like-of']]
        } else if (this.isRepost) {
          return this.item.refs[this.item['repost-of']]
        } else if (this.isBookmark) {
          return this.item.refs[this.item['bookmark-of']]
        }
      },
      isRef() {
        return this.isLike || this.isRepost || this.isBookmark
      },
      isLike() {
        return this.hasRef('like-of')
      },
      isBookmark() {
        return this.hasRef('bookmark-of')
      },
      isRepost() {
        return this.hasRef('repost-of')
      },
      refText() {
        if (this.isLike) {
          return 'liked'
        }
        if (this.isRepost) {
          return 'reposted'
        }
        if (this.isBookmark) {
          return 'bookmarked'
        }
        return ''
      },
      main_content() {
        let content = this.currentItem.content
        if (content) {
          if (content.html) {
            return content.html
          } else if (content.text) {
            return content.text
          }
          return content
        }
        content = this.currentItem.summary
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
        if (this.currentItem.photo && this.currentItem.photo.length >= 1) {
          return this.currentItem.photo[0]
        }
        return false
      },
      photo_rest() {
        if (this.currentItem.photo && this.currentItem.photo.length > 1) {
          return this.currentItem.photo.slice(1)
        }
        return []
      },
      outside_author_name() {
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
      outside_author_url() {
        if (!this.item.author) {
          return '';
        }
        if (!this.item.author.url) {
          return '';
        }
        return this.item.author.url
      },
      author_name() {
        if (!this.currentItem.author) {
          return 'anonymouse';
        }
        if (!this.currentItem.author.name) {
          if (this.currentItem.author.url) {
            try {
              return new URL(this.currentItem.author.url).hostname
            } catch (e) {
              return this.currentItem.author.url
            }
          }
        }
        return this.currentItem.author.name
      },
      author_url() {
        if (!this.currentItem.author) {
          return '';
        }
        if (!this.currentItem.author.url) {
          return '';
        }
        return this.currentItem.author.url
      },
      author_photo() {
        if (!this.currentItem.author) {
          return '';
        }
        if (!this.currentItem.author.photo) {
          return '';
        }
        return this.currentItem.author.photo
      }
    },
    watch: {
      item() {
        this.$nextTick(() => {
          const el = this.$refs['content-container']
          if (!el) {
            // eslint-disable-next-line
            console.log('ref content-container not found')
            return
          }
          this.hasHiddenContent = el.scrollHeight > el.clientHeight
          this.hiddenContentVisible = false
        })
      }
    }
  }
</script>

<style scoped>
  .entry.unread {
    outline: 2px solid #5757e8;
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
  .is-pre {
    white-space: pre-wrap;
  }

  .content-container {
    max-height: 20vh;
    overflow: hidden;
  }

  .content-container.open {
    max-height: fit-content;
  }

</style>
