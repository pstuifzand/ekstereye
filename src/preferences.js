import Vue from 'vue'

// Reading preferences are the reader's, not the feed's: keep them on this device and
// apply them before the first paint so the page never flashes the wrong theme.
const STORAGE_KEY = 'reader_preferences'

function stored() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {}
  } catch (error) {
    return {}
  }
}

const saved = stored()

export const preferences = Vue.observable({
  theme: saved.theme === 'dark' ? 'dark' : 'light',
  scale: Number(saved.scale) >= 0.85 && Number(saved.scale) <= 1.3 ? Number(saved.scale) : 1,
  debug: Boolean(saved.debug) || /(?:\?|&)debug=1\b/.test(window.location.search)
})

export function applyPreferences() {
  document.body.classList.toggle('theme-dark', preferences.theme === 'dark')
  document.documentElement.style.setProperty('--font-scale', String(preferences.scale))
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: preferences.theme,
      scale: preferences.scale,
      debug: preferences.debug
    }))
  } catch (error) {
    // A reader with storage disabled still gets their settings for this session.
  }
}

export function toggleTheme() {
  preferences.theme = preferences.theme === 'dark' ? 'light' : 'dark'
  applyPreferences()
}

export function stepScale(direction) {
  const next = Math.round((preferences.scale + direction * 0.05) * 100) / 100
  preferences.scale = Math.min(1.3, Math.max(0.85, next))
  applyPreferences()
}

export function toggleDebug() {
  preferences.debug = !preferences.debug
  applyPreferences()
}

export default { preferences, applyPreferences, toggleTheme, stepScale, toggleDebug }
