// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['eve/nuxt'],
  css: ['markstream-vue/index.css'],
  vite: {
    optimizeDeps: {
      include: ['eve/vue', 'markstream-vue', 'markstream-vue/utils']
    }
  }
})
