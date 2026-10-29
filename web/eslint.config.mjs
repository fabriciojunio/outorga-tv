import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // As capas vêm do TMDB e do PC de casa. O next/image passaria tudo pelo
      // otimizador de imagens do Next, que teve RCE com SVG (GHSA-2464-fhr4-w9xw)
      // e cobra uso na Vercel. <img> com tamanho fixo no CSS é a escolha aqui.
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**']),
]);
