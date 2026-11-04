// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['eve/nuxt', '@pinia/nuxt'],
  css: ['markstream-vue/index.css', '~/assets/css/main.css'],
  vite: {
    optimizeDeps: {
      include: ['eve/vue', 'lucide-vue-next', 'markstream-vue', 'markstream-vue/utils']
    }
  }
})
