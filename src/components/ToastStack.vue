<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="false">
    <div
      v-for="note in notifications"
      :key="note.id"
      class="toast"
      :class="'toast--' + note.type"
      :role="note.type === 'error' ? 'alert' : 'status'"
    >
      <span class="toast-message">{{ note.message }}</span>
      <a
        v-if="note.url"
        class="toast-link"
        :href="note.url"
        target="_blank"
        rel="noopener noreferrer"
      >View post</a>
      <button class="toast-close" aria-label="dismiss notification" @click="dismiss(note.id)">&times;</button>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'ToastStack',
    computed: {
      notifications() {
        return this.$store.state.notifications
      }
    },
    methods: {
      dismiss(id) {
        this.$store.dispatch('dismissNotification', id)
      }
    }
  }
</script>

<style scoped>
  .toast-stack {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 60;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 22rem;
    padding: 10px 14px;
    border-radius: 6px;
    border: 1px solid var(--line, #e4e4e4);
    border-left: 4px solid var(--accent, #5757e8);
    background: var(--card, #fff);
    color: var(--fg, #2f2f2f);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
    font-size: 0.9rem;
    line-height: 1.3;
    animation: toast-in 140ms ease-out;
  }

  .toast--error {
    border-left-color: #d63a3a;
  }

  .toast-message {
    flex: 1;
  }

  .toast-link {
    color: var(--accent, #5757e8);
    white-space: nowrap;
  }

  .toast-close {
    border: 0;
    background: transparent;
    color: var(--muted, #7a7a7a);
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 2px;
  }

  .toast-close:hover {
    color: var(--fg, #2f2f2f);
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 480px) {
    .toast-stack {
      left: 12px;
      right: 12px;
      align-items: stretch;
    }

    .toast {
      max-width: none;
    }
  }
</style>
