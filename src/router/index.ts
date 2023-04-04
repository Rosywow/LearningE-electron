import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/video',
      name: 'Video',
      component: () => import('../views/Video.vue')
    },
    // {
    //   path: '/export',
    //   name: 'Export',
    //   component: () => import('../views/export.vue')
    // }
  ]
})

export default router
