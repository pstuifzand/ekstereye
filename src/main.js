import Vue from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import App from './App.vue'
import router from './router'
import store from './store'
import 'bulma/bulma.sass'
import '@/styles.scss'

dayjs.extend(relativeTime)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
