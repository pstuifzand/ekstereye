import Vue from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import App from './App.vue'
import router from './router'
import store from './store'
import 'bulma/bulma.sass'
import '@/styles.scss'
import { applyPreferences } from '@/preferences'

dayjs.extend(relativeTime)

Vue.config.productionTip = false

// Theme and text size are the reader's; apply them before the app paints.
applyPreferences()

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
