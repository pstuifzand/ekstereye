// What a dialog owes the reader, in one place: Escape closes it, Tab stays inside it,
// and focus returns to whatever opened it. Without this, Escape did nothing on the
// debug, feeds and add-feed dialogs and Tab walked into the timeline behind them.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

export default {
  computed: {
    modalIsOpen() {
      return Boolean(this[this.$options.modalOpenProp || 'isOpen'])
    }
  },

  watch: {
    modalIsOpen(open) {
      if (open) {
        this.openModal()
      } else {
        this.closeModal()
      }
    }
  },

  mounted() {
    if (this.modalIsOpen) {
      this.openModal()
    }
  },

  beforeDestroy() {
    this.closeModal()
  },

  methods: {
    openModal() {
      this.modalWasOpen = true
      this.modalReturnFocus = document.activeElement
      document.addEventListener('keydown', this.modalKeydown, true)
      this.$nextTick(() => this.focusFirstInModal())
    },

    closeModal() {
      if (!this.modalWasOpen) {
        // Never steal focus on a destroy that had nothing to restore it for.
        return
      }
      this.modalWasOpen = false
      document.removeEventListener('keydown', this.modalKeydown, true)
      const target = this.modalReturnFocus
      this.modalReturnFocus = null
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus()
      }
    },

    focusableInModal() {
      if (!this.$el || !this.$el.querySelectorAll) {
        return []
      }
      return Array.from(this.$el.querySelectorAll(FOCUSABLE))
        .filter(el => el.offsetParent !== null)
    },

    focusFirstInModal() {
      const focusable = this.focusableInModal()
      if (focusable.length > 0) {
        focusable[0].focus()
      }
    },

    modalKeydown(event) {
      if (!this.modalIsOpen) {
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        this.dismissModal()
        return
      }
      if (event.key !== 'Tab') {
        return
      }
      const focusable = this.focusableInModal()
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!this.$el.contains(event.target)) {
        event.preventDefault()
        first.focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },

    dismissModal() {
      const action = this.$options.modalCloseAction
      if (action) {
        this.$store.dispatch(action)
      } else {
        this.$emit('close')
      }
    }
  }
}
