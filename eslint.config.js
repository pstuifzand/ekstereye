import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**'],
    linterOptions: {
      // The code base pre-dates the report-unused-disable-directives default,
      // so the leftover disable comments are not worth churning the diff for.
      reportUnusedDisableDirectives: 'off'
    }
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/vue2-essential'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    },
    rules: {
      // Names like Channel, Entry and Timeline are the app's vocabulary.
      'vue/multi-word-component-names': 'off',
      // Several computeds intentionally fall through to undefined.
      'vue/return-in-computed-property': 'off',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }]
    }
  }
]
