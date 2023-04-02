import { createApp } from 'vue'
import "./style.css"
import App from './App.vue'
import './samples/node-api'
import router from './router'
router.onError((error) => {
  if (error.message.includes('Missing required param')) {
    console.warn('路由跳转出现错误：', error);
  } else {
    throw error;
  }
});
const app = createApp(App)

app.use(router)

app
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
