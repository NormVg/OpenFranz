// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  sourcemap: false,
  modules: ['eve/nuxt', '@pinia/nuxt', 'workflow/nuxt'],
  css: ['markstream-vue/index.css', '~/assets/css/main.css'],
  vite: {
    optimizeDeps: {
      include: [
        'better-auth/vue',
        'eve/vue',
        'lucide-vue-next',
        'markstream-vue',
        'markstream-vue/utils',
        'zod'
      ]
    }
  }
})
