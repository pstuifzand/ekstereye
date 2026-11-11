import Vue from 'vue'

// Reading preferences are the reader's, not the feed's: keep them on this device and
// apply them before the first paint so the page never flashes the wrong theme.
const STORAGE_KEY = 'reader_preferences'

// Three states, two buttons. 'system' follows the OS and is the default; 'light' and
// 'dark' are explicit choices. Pressing the button that is already chosen returns to
// 'system', so the explicit setting can always be undone without a third control.
const THEMES = ['system', 'light', 'dark']

function stored() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {}
  } catch (error) {
    return {}
  }
}

const saved = stored()

export const preferences = Vue.observable({
  theme: THEMES.indexOf(saved.theme) >= 0 ? saved.theme : 'system',
  scale: Number(saved.scale) >= 0.85 && Number(saved.scale) <= 1.3 ? Number(saved.scale) : 1
})

const darkQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

// What is on screen right now: the explicit choice, or whatever the OS says.
export function effectiveTheme() {
  if (preferences.theme !== 'system') {
    return preferences.theme
  }
  return darkQuery && darkQuery.matches ? 'dark' : 'light'
}

export function applyPreferences() {
  const theme = effectiveTheme()
  document.body.classList.toggle('theme-dark', theme === 'dark')
  // Native widgets (scrollbars, selects, date pickers) follow this, not our variables.
  document.documentElement.style.colorScheme = theme
  document.documentElement.style.setProperty('--font-scale', String(preferences.scale))
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: preferences.theme,
      scale: preferences.scale
    }))
  } catch (error) {
    // A reader with storage disabled still gets their settings for this session.
  }
}

export function setTheme(theme) {
  if (THEMES.indexOf(theme) < 0 || theme === 'system') {
    preferences.theme = 'system'
  } else {
    preferences.theme = preferences.theme === theme ? 'system' : theme
  }
  applyPreferences()
}

// An OS change only matters while the reader has not chosen a theme themselves.
if (darkQuery) {
  const onSystemChange = () => {
    if (preferences.theme === 'system') {
      applyPreferences()
    }
  }
  if (darkQuery.addEventListener) {
    darkQuery.addEventListener('change', onSystemChange)
  } else if (darkQuery.addListener) {
    darkQuery.addListener(onSystemChange)
  }
}

export function stepScale(direction) {
  const next = Math.round((preferences.scale + direction * 0.05) * 100) / 100
  preferences.scale = Math.min(1.3, Math.max(0.85, next))
  applyPreferences()
}

export default { preferences, applyPreferences, setTheme, effectiveTheme, stepScale }
