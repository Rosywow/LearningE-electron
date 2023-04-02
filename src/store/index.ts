// store.ts
import { reactive } from 'vue'

const storedVideoInfo = localStorage.getItem('videoInfo');
export const store = reactive({
  videoInfo: storedVideoInfo ? JSON.parse(storedVideoInfo) : {
    title: '',
  }
})

// 在组件中更新store.videoInfo时，同时更新localStorage中的数据
function updateStoreAndLocalStorage() {
  localStorage.setItem('videoInfo', JSON.stringify(store.videoInfo));
}
