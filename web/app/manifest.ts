import type { MetadataRoute } from 'next';

/**
 * Manifesto do app. É o que faz o celular oferecer "Adicionar à tela
 * inicial" e abrir o Outorga TV em tela cheia, sem a barra do navegador, como
 * se fosse aplicativo instalado. Abre direto no modo de casa.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Outorga TV',
    short_name: 'Outorga TV',
    description: 'Filmes, séries e os vídeos do seu PC, no computador, no celular e na TV',
    lang: 'pt-BR',
    start_url: '/casa',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0d0f14',
    theme_color: '#0d0f14',
    categories: ['entertainment'],
    icons: [
      { src: '/icones/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icones/512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icones/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
