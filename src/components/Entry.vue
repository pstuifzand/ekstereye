<template>
  <div>
    <div :class="classes" @click="markRead(); $emit('select')">
      <div class="card-image" v-if="mainImage">
        <figure class="image">
          <img :src="mainImage" loading="lazy" decoding="async" alt=""/>
        </figure>
      </div>

      <div class="card-content">
        <div class="media">
          <div class="media-left">
            <p class="image is-48x48 avatar">
              <img v-if="author_photo && !avatarFailed" :src="author_photo" loading="lazy" decoding="async" alt=""
                   @error="avatarFailed = true"/>
              <span v-else class="avatar-fallback" aria-hidden="true">{{ author_initial }}</span>
            </p>
          </div>

          <div ref="content-container" :class="{'content': true, 'content-container': true, 'open': hiddenContentVisible}">
            <div v-if="isRef">
              <div><small><a :href="outside_author_url">{{ outside_author_name }}</a>&nbsp;<span v-text="refText"></span>:</small></div>
            </div>

            <div>
              <div><a :href="author_url">{{ author_name }}</a>
                &middot;
                <a :href="currentItem.url" target="_new" :title="niceTimeTitle"><span class="published">{{ niceTime }}</span></a>
              </div>

              <h3 class="title is-6" v-if="currentItem.name">
                <a :href="currentItem.url" target="_blank" rel="noopener noreferrer" v-text="currentItem.name"></a>
              </h3>
              <div class="content html-body" v-if="main_content_html" v-html="main_content_html"></div>
              <div class="content html-body is-pre" v-else-if="main_content_text" v-text="main_content_text"></div>

              <div class="photos" v-if="photo_rest.length">
                <div v-for="photo in photo_rest" :key="photo" class="photo">
                  <img :src="photo" class="image" loading="lazy" decoding="async" alt=""
                       @click="replaceMainImage(photo)"/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="level entry-actions" @click.stop>
            <div class="level-item">
              <button class="is-link" v-if="hasHiddenContent" @click.prevent.stop="toggleHiddenContent">
                {{ hiddenContentVisible ? 'Show less' : 'Read more' }}
              </button>
            </div>
            <div class="level-item">
                <small>
                <span v-if="showFooterButtons">
                <button type="button" class="entry-action" @click="like">Like</button>
                &middot; <button type="button" class="entry-action" @click.prevent="openReply">Reply</button>
                &middot; <button type="button" class="entry-action" @click.prevent="openRepost">Repost</button>
                &middot; <button type="button" class="entry-action" @click.prevent="openBookmark">Bookmark</button>
                &middot; <button type="button" class="entry-action" @click.prevent.stop="copyLink">{{ copied ? 'Copied' : 'Copy link' }}</button>
                &middot; <button type="button" class="entry-action" @click.prevent="$emit('followFeed', author_url)" title="Try to follow the feed this item comes from">Follow</button>
                <template v-if="debugEnabled">
                  &middot; <button type="button" class="entry-action" @click.prevent="debug">Debug</button>
                </template>
                </span>
                </small>
            </div>
          </div>
        </div>
        <div class="media" v-if="reposting" @click.stop>
          <div class="media-content">
            <div class="field">
              <label class="label">Repost with a note</label>
              <div class="control">
                <textarea class="textarea" ref="repostText" v-model="repostNote"></textarea>
              </div>
            </div>
            <div class="field">
              Syndication: <syndication-buttons v-model="selected" :targets="targets"/>
            </div>
            <div class="field">
              Destination: <destination-buttons v-model="selectedDestinations" :targets="destinations"/>
            </div>
            <div class="field">
              <div class="control">
                <button class="button is-primary" @click="repost">Repost</button>
                <button class="button" @click="reposting = false">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div class="media" v-if="replying" @click.stop>
          <div class="media-content">
            <div class="field">
              <label class="label">Write your reply:</label>
              <div class="control">
                <textarea class="textarea" ref="replyText" v-model="replyText"></textarea>
              </div>
            </div>
            <div class="field">
              <div class="control">
                <button class="button is-primary" @click="reply">Reply</button>
              </div>
            </div>
          </div>
        </div>
        <div class="media" v-if="bookmarking" @click.stop>
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
import { stamp, absoluteTime } from '@/relative-time'
import { entryKind } from '@/entry-kind'
import { preferences } from '@/preferences'
import { sanitizeHtml } from '@/sanitize'
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
    props: ['item', 'isSelected'],

    data() {
      return {
        'replying': false,
        'replyText': '',
        'showFooterButtons': true,
        reposting: false,
        repostNote: '',
        copied: false,
        copyTimer: null,
        bookmarking: false,
        bookmarkTitle: '',
        bookmarkDescription: '',
        targets: [],
        selected: [],
        destinations: [],
        selectedDestinations: [],
        categories: [],
        hasHiddenContent: false,
        hiddenContentVisible: false,
        contentObserver: null,
        mainImage: null,
        avatarFailed: false,
      }
    },

    methods: {
      debug() {
        this.$emit('debug', this.item)
      },
      openReply() {
        this.replying = true
        this.$nextTick(() => {
          if (this.$refs.replyText) {
            this.$refs.replyText.focus()
          }
        })
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
      openRepost() {
        this.reposting = true
        this.repostNote = ''
        this.selected = []
        this.selectedDestinations = []
        this.$store.dispatch('fetchSyndicationTargets')
          .then((res) => { this.targets = res['syndicate-to'] || [] })
        this.$store.dispatch('fetchDestinations')
          .then((res) => { this.destinations = res['destination'] || [] })
        this.$nextTick(() => {
          if (this.$refs.repostText) {
            this.$refs.repostText.focus()
          }
        })
      },
      repost() {
        const properties = {
          'repost-of': [this.currentItem.url],
          'mp-syndicate-to': this.selected,
          'mp-destination': this.selectedDestinations
        }
        if (this.repostNote) {
          properties.content = [this.repostNote]
        }
        this.$store.dispatch('micropubPost', {
          'type': ['h-entry'],
          'properties': properties,
        }).then(() => {
          this.repostNote = ''
          this.selected = []
          this.selectedDestinations = []
          this.reposting = false
        })
      },
      copyLink() {
        const url = this.currentItem.url
        const done = () => {
          this.copied = true
          window.clearTimeout(this.copyTimer)
          this.copyTimer = window.setTimeout(() => { this.copied = false }, 1500)
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done).catch(() => this.copyFallback(url, done))
        } else {
          this.copyFallback(url, done)
        }
      },
      copyFallback(url, done) {
        const field = document.createElement('textarea')
        field.value = url
        field.setAttribute('readonly', 'readonly')
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.appendChild(field)
        field.select()
        try {
          document.execCommand('copy')
          done()
        } finally {
          document.body.removeChild(field)
        }
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
        if (Object.prototype.hasOwnProperty.call(this.item, key) && Object.prototype.hasOwnProperty.call(this.item, 'refs')) {
          if (Object.prototype.hasOwnProperty.call(this.item.refs, this.item[key])) {
            return true
          }
        }
        return false
      },
      toggleHiddenContent() {
        this.hiddenContentVisible = !this.hiddenContentVisible
        this.$nextTick(this.measureHiddenContent)
      },
      measureHiddenContent() {
        const el = this.$refs['content-container']
        if (!el || this.hiddenContentVisible) {
          // An expanded entry is always taller than its clamp, so measuring it now would
          // report "nothing hidden" and take the toggle away.
          return
        }
        this.hasHiddenContent = el.scrollHeight > el.clientHeight + 1
      },
      watchContentImages() {
        const el = this.$refs['content-container']
        if (!el) {
          return
        }
        el.querySelectorAll('img').forEach((img) => {
          if (img.complete) {
            return
          }
          img.addEventListener('load', this.measureHiddenContent, {once: true})
          img.addEventListener('error', this.measureHiddenContent, {once: true})
        })
      },
      observeContent() {
        if (!('ResizeObserver' in window)) {
          return
        }
        const el = this.$refs['content-container']
        if (!el) {
          return
        }
        if (this.contentObserver) {
          this.contentObserver.disconnect()
        }
        this.contentObserver = new ResizeObserver(() => this.measureHiddenContent())
        // The clamp fixes the container's own height, so an image growing inside it never
        // resizes the element being observed; watch the images themselves as well.
        this.contentObserver.observe(el)
        el.querySelectorAll('img').forEach((img) => this.contentObserver.observe(img))
      },
      replaceMainImage(newImage) {
        this.mainImage = newImage
      }
    },

    mounted() {
      this.mainImage = this.photo_first
      this.showFooterButtons = true
      this.hiddenContentVisible = false
      this.$nextTick(() => {
        this.measureHiddenContent()
        this.watchContentImages()
        this.observeContent()
      })
    },

    beforeDestroy() {
      if (this.contentObserver) {
        this.contentObserver.disconnect()
      }
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
        return stamp(this.currentItem.published)
      },
      niceTimeTitle() {
        return absoluteTime(this.currentItem.published)
      },
      kind() {
        return entryKind(this.currentItem)
      },
      debugEnabled() {
        return preferences.debug
      },
      classes() {
        return {
          'entry': true,
          'card': true,
          'mb-20': true,
          'unread': !this.item._is_read,
          'selected': Boolean(this.isSelected),
          'kind-article': this.kind === 'article',
          'kind-status': this.kind === 'status',
          'kind-media': this.kind === 'media'
        }
      },
      innerRef() {
        if (this.isLike) {
          return this.item.refs[this.item['like-of']] || {
            type: "entry",
            content: {
              text: 'Like of ' + this.item['like-of']
            },
            url: this.item['like-of'],
          }
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
      rawContent() {
        const source = this.currentItem.content || this.currentItem.summary
        // mf2 allows a single value or an array of values.
        return Array.isArray(source) ? source[0] : source
      },
      main_content_html() {
        const content = this.rawContent
        if (content && typeof content === 'object' && typeof content.html === 'string') {
          return sanitizeHtml(content.html, this.currentItem.url)
        }
        return ''
      },
      main_content_text() {
        const content = this.rawContent
        if (!content) {
          return ''
        }
        if (typeof content === 'string') {
          return content
        }
        if (typeof content === 'object' && typeof content.text === 'string') {
          return content.text
        }
        // Nothing renderable, but the entry still deserves a pointer to itself.
        return this.currentItem.url || ''
      },
      photo_first() {
        if (this.currentItem.photo && this.currentItem.photo.length >= 1) {
          return this.currentItem.photo[0]
        }
        return false
      },
      photo_all() {
        if (this.currentItem.photo && this.currentItem.photo.length > 1) {
          return this.currentItem.photo
        }
        return []
      },
      photo_rest() {
        // Everything except what the header already shows: swapping a photo into the
        // header puts the previous one back in the strip, so the swap is reversible.
        if (!this.currentItem.photo || this.currentItem.photo.length < 2) {
          return []
        }
        return this.currentItem.photo.filter((photo) => photo !== this.mainImage)
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
      author_initial() {
        const name = this.author_name || ''
        return name.trim().charAt(0).toUpperCase() || '?'
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
        this.avatarFailed = false
        this.mainImage = this.photo_first
        this.hiddenContentVisible = false
        this.$nextTick(() => {
          this.measureHiddenContent()
          this.watchContentImages()
          this.observeContent()
        })
      }
    }
  }
</script>

<style scoped>
  .entry.unread {
    outline: 2px solid var(--accent, #5757e8);
  }

  /* Keyboard selection: neutral bar and ring, so hue always means "unread" (blue)
     and the selected card is read by shape instead. */
  .entry.selected {
    --entry-bg: var(--sel, #f4f4f6);
    box-shadow: inset 5px 0 0 0 var(--sel-bar, #363636), 0 0 0 3px var(--sel-bar, #363636);
    background: var(--entry-bg);
  }

  .entry-action {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .entry-action:focus-visible {
    outline: 2px solid var(--accent, #5757e8);
    outline-offset: 2px;
  }

  .media .entry {
    margin-top: 0.75rem;
  }

  .media .entry .media {
    margin-top: 0;
  }

  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--sel, #eef0f6);
    color: var(--accent, #5757e8);
    font-weight: 600;
  }

  .photo.active img {
    outline: 2px solid var(--accent, #5757e8);
  }

  .photos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 4px;
  }
  .is-pre {
    white-space: pre-wrap;
  }

  .html-body ::v-deep img {
    max-width: 100%;
    height: auto;
  }

  .html-body ::v-deep a {
    word-break: break-word;
  }

  .entry {
    --entry-bg: var(--card, #fff);
  }

  .content-container {
    position: relative;
    /* Ten lines at the article rhythm: enough to tell what a piece argues, short
       enough that a long channel is still a list. */
    max-height: 17.5rem;
    overflow: hidden;
  }

  .content-container.open {
    max-height: fit-content;
  }

  .kind-status .content-container,
  .kind-media .content-container {
    max-height: none;
    overflow: visible;
  }

  /* A fade says "there is more" without an arrow in the middle of the text. */
  .kind-article .content-container:not(.open)::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2.5rem;
    background: linear-gradient(to bottom, transparent, var(--entry-bg));
    pointer-events: none;
  }

  .kind-article .title {
    font-size: 1.35rem;
    line-height: 1.3;
    margin: .35rem 0 .6rem;
  }

  .title a {
    color: inherit;
  }

  .title a:hover {
    text-decoration: underline;
  }


  .kind-article .html-body {
    max-width: 68ch;
    font-size: 1.0625rem;
    line-height: 1.65;
  }

  .kind-article .html-body p {
    margin-bottom: .8em;
  }

  .kind-article .card-image img {
    max-height: 45vh;
    object-fit: cover;
    width: 100%;
  }

  /* A photo post is the photo, but the album strip keeps it from eating the screen. */
  .kind-media .card-image img {
    max-height: 55vh;
    object-fit: cover;
    width: 100%;
  }

  .kind-media .photos {
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    max-width: 60%;
  }

  .kind-media .photos .photo img {
    height: 64px;
    object-fit: cover;
    width: 100%;
  }

  .kind-status .card-content {
    padding: .7rem .95rem .55rem;
  }

  .kind-status .media-left {
    margin-right: .6rem;
  }

  .kind-status .avatar,
  .kind-status .avatar-fallback {
    width: 28px;
    height: 28px;
    font-size: .8rem;
  }

  .kind-status .html-body,
  .kind-status .content {
    font-size: .98rem;
    line-height: 1.5;
  }

  .kind-status .html-body p {
    margin-bottom: .4em;
  }

  /* Actions are furniture until the reader is on the card. */
  .entry-actions {
    opacity: 0;
    transition: opacity .12s ease-in-out;
  }

  .entry:hover .entry-actions,
  .entry.selected .entry-actions,
  .entry:focus-within .entry-actions {
    opacity: 1;
  }

  @media (hover: none) {
    .entry-actions {
      opacity: 1;
    }
  }

</style>
