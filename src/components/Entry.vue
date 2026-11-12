<template>
  <div :class="{'reading-view': readerMode}">
    <div v-if="readerMode" class="reader-action-bar" @click.stop>
        <button type="button" class="entry-action" @click="like">Like</button>
        <button type="button" class="entry-action" @click.prevent="openReply">Reply</button>
        <button type="button" class="entry-action" @click.prevent="openRepost">Repost</button>
        <button type="button" class="entry-action" @click.prevent="openBookmark">Bookmark</button>
        <button type="button" class="entry-action" @click.prevent.stop="copyLink">{{ copied ? 'Copied' : 'Copy link' }}</button>
        <a v-if="currentItem.url" class="entry-action" :href="currentItem.url" target="_blank" rel="noopener noreferrer">Open original ↗</a>
      </div>
    <div :class="[classes, {'reading-detail': readerMode}]" @click="markRead(); $emit('select')">
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

          <div ref="content-container" :class="{'content': true, 'content-container': true, 'open': hiddenContentVisible, 'clamped': hasHiddenContent}">
            <div v-if="isRef" class="ref-note">
              <span class="ref-glyph" aria-hidden="true" v-text="refGlyph"></span>
              <span class="ref-verb" v-text="refVerb"></span>
              <a class="ref-target" :href="refTargetUrl" target="_blank" rel="noopener noreferrer"
                 :title="refTargetUrl"><span v-text="refTargetLabel"></span></a>
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
              <button class="is-link" v-if="hasHiddenContent && !readerMode" @click.prevent.stop="toggleHiddenContent">
                {{ hiddenContentVisible ? 'Show less' : 'Read more' }}
              </button>
            </div>
            <div class="level-item" v-if="!readerMode">
                <small>
                <span v-if="showFooterButtons">
                <button type="button" class="entry-action" @click="like">Like</button>
                &middot; <button type="button" class="entry-action" @click.prevent="openReply">Reply</button>
                &middot; <button type="button" class="entry-action" @click.prevent="openRepost">Repost</button>
                &middot; <button type="button" class="entry-action" @click.prevent="openBookmark">Bookmark</button>
                &middot; <button type="button" class="entry-action" @click.prevent.stop="copyLink">{{ copied ? 'Copied' : 'Copy link' }}</button>
                &middot; <button type="button" class="entry-action" @click.prevent="$emit('followFeed', author_url)" title="Try to follow the feed this item comes from">Follow</button>
                &middot; <button type="button" class="entry-action" @click.prevent="debug">Debug</button>
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
import { sanitizeHtml } from '@/sanitize'
import { refKind, refVerb, refGlyph, refTarget, refLabel, prettyTarget } from '@/refs'
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
    props: {
      item: Object,
      isSelected: Boolean,
      readerMode: { type: Boolean, default: false }
    },

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
          post: {
            'type': ['h-entry'],
            'properties': {
              'in-reply-to': [this.currentItem.url],
              'content': [this.replyText]
            },
          },
          success: 'Reply posted',
          failure: 'Reply failed'
        }).then(() => {
          this.replyText = '';
          this.replying = false
        }).catch(() => {})
      },
      like() {
        this.$store.dispatch('micropubPost', {
          post: {
            'type': ['h-entry'],
            'properties': {
              'like-of': [this.currentItem.url]
            },
          },
          success: 'Liked',
          failure: 'Like failed'
        }).catch(() => {})
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
          post: {
            'type': ['h-entry'],
            'properties': properties,
          },
          success: 'Reposted',
          failure: 'Repost failed'
        }).then(() => {
          this.repostNote = ''
          this.selected = []
          this.selectedDestinations = []
          this.reposting = false
        }).catch(() => {})
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
          post: {
            'type': ['h-entry'],
            'properties': {
              'bookmark-of': [this.currentItem.url],
              'name': [this.bookmarkTitle],
              'content': [this.bookmarkDescription ],
              'category': this.categories,
              'mp-syndicate-to': this.selected,
              'mp-destination': this.selectedDestinations
            },
          },
          success: 'Bookmark saved',
          failure: 'Bookmark failed'
        }).then(() => {
          this.bookmarkTitle = '';
          this.bookmarkDescription = '';
          this.selected = []
          this.selectedDestinations = []
          this.bookmarking = false
          this.categories = []
        }).catch(() => {})
      },
      // `refs` is optional: a notification feed commonly sends `like-of` with no refs at
      // all. Requiring a refs entry meant those cards were not recognised as likes, and
      // rendered as an empty box with no hint of what had been liked.
      hasRef(key) {
        return Object.prototype.hasOwnProperty.call(this.item, key) && Boolean(this.item[key])
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
        // `refs` is an extension a Microsub server may leave out entirely — a like
        // notification often arrives with nothing but `like-of`. Indexing undefined
        // threw here, which took the whole card's render with it and left a blank box.
        const refs = this.item.refs || {}
        if (this.isLike) {
          // Keep the entry's own author and date (the notification source), point the
          // link at the liked URL, and drop the body: the ref-note already names the
          // target, so a synthetic "Like of <url>" text would only say it twice.
          return refs[this.item['like-of']] || {
            ...this.item,
            url: this.item['like-of'],
            name: '',
            content: '',
            summary: ''
          }
        } else if (this.isRepost) {
          const ref = refs[this.item['repost-of']]
          return ref ? { ...ref, url: ref.url || this.item['repost-of'] } : this.item
        } else if (this.isBookmark) {
          const ref = refs[this.item['bookmark-of']]
          // Some feeds only include a URL in refs; keep the bookmark's own
          // title/content visible while using the referenced URL as the link.
          return ref ? {
            ...this.item,
            ...ref,
            name: ref.name || this.item.name,
            content: ref.content || this.item.content,
            summary: ref.summary || this.item.summary,
            author: ref.author || this.item.author || this.item._source,
            url: ref.url || this.item['bookmark-of']
          } : this.item
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
      refKindName() {
        return refKind(this.item)
      },
      refVerb() {
        return refVerb(this.item)
      },
      refGlyph() {
        return refGlyph(this.item)
      },
      refTargetUrl() {
        return refTarget(this.item)
      },
      // Prefer the referenced entry's title, then its author, then a readable URL:
      // "Liked p83.nl/2026/11/ek-reader" beats a blank card and tells the reader what
      // was liked before they open it.
      refTargetLabel() {
        // Only a real `refs` entry may lend its title or author: for a bare bookmark
        // `currentItem` is the bookmark itself, so its author is not the target's.
        const refs = this.item.refs || {}
        return refLabel(this.item, refs[this.refTargetUrl] || null) || prettyTarget(this.refTargetUrl)
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

  /* A fade says "there is more" without an arrow in the middle of the text, so it
     belongs only on entries that are actually cut off — a short article drawn with a
     gradient over its last line reads as a loading shimmer. */
  .kind-article .content-container.clamped:not(.open)::after {
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
  .reader-action-bar {
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 10px 24px;
    border-bottom: 1px solid var(--line);
    background: var(--reader-bg);
  }
  .reader-action-bar .entry-action { padding: 7px 10px; border-radius: 6px; color: var(--muted); text-decoration: none; font-size: .8rem; transition: background-color .15s, color .15s; }
  .reader-action-bar .entry-action:hover { background: var(--hover-bg); color: var(--fg); }
  .reading-view .entry.reading-detail { max-width: 780px; margin: 0 auto; background: transparent; box-shadow: none; outline: none; border: 0; }
  .reading-detail .card-content { padding: 48px 36px; }
  .reading-detail .media-left { margin-right: 16px; }
  .reading-detail .title.is-6 { font-size: 2rem; line-height: 1.2; letter-spacing: -.035em; margin: 16px 0 24px; }
  .reading-detail .content-container > div > div:first-child { font-size: .8rem; color: var(--muted); }
  @media (max-width: 600px) { .reading-detail .card-content { padding: 28px 20px; } .reading-detail .title.is-6 { font-size: 1.6rem; } }

  .reading-detail .content-container {
    max-height: none;
    overflow: visible;
  }

  .reading-detail .content-container::after { display: none; }
  .reading-detail .html-body { max-width: 72ch; font-size: 1rem; line-height: 1.75; }
  .reading-detail .html-body ::v-deep blockquote { background: transparent; border-left: 2px solid var(--accent); padding: 4px 0 4px 20px; }

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
