import purgecss from '@fullhuman/postcss-purgecss'

// The bundle ships all of bulma (~217 kB) for the ~130 class names the templates use.
// The extractor is deliberately loose -- every word in the source counts as a candidate --
// because class names here are written as string literals in computed objects, not only
// in static class="" attributes, and a class dropped by mistake is invisible in a build.
export default {
  plugins: [
    purgecss({
      content: ['./index.html', './src/**/*.{vue,js}'],
      defaultExtractor: (content) => content.match(/[A-Za-z0-9_:/.-]+/g) || [],
      safelist: {
        standard: [
          'is-active', 'is-loading', 'is-primary', 'is-success', 'is-danger',
          'is-small', 'is-large', 'is-expanded', 'is-pre', 'open', 'selected',
          'unread', 'theme-dark', 'channels-open', 'menuActive', 'modal'
        ],
        deep: [/^kind-/, /^timeline-/, /^html-body/, /^entry/, /^avatar/, /^photo/],
        greedy: [/^data-v-/]
      },
      keyframes: true
    })
  ]
}
