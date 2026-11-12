<template>
  <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'search'"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></template>
    <template v-else-if="name === 'sun'"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></template>
    <path v-else-if="name === 'moon'" d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/>
    <template v-else-if="name === 'monitor'"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></template>
    <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></template>
    <template v-else-if="name === 'logout'"><path d="M10 17v3H5V4h5v3m4 1 4 4-4 4m4-4H9"/></template>
    <path v-else-if="name === 'plus'" d="M12 5v14M5 12h14"/>
    <template v-else-if="name === 'compose'"><path d="M12 20H4V4h8m2 3 3-3 3 3-9 9-4 1 1-4Z"/></template>
    <template v-else-if="name === 'help'"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2-2.5 3.8m0 3h.01"/></template>
    <path v-else-if="name === 'check'" d="m5 12 4 4L19 6"/>
    <path v-else-if="name === 'more'" d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>
    <template v-else-if="name === 'feeds'"><path d="M5 19h.01M5 12a7 7 0 0 1 7 7M5 5a14 14 0 0 1 14 14"/></template>
  </svg>
</template>
<script>export default { name: 'ToolbarIcon', props: { name: { type: String, required: true } } }</script>
<style scoped>.toolbar-icon { width: 16px; height: 16px; flex: none; display: block; }</style>
