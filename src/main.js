import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import 'bulma'
import '@/styles.scss'
import '@primer/css/utilities/index.scss';

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
