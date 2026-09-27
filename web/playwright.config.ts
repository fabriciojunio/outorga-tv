import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta do modo de casa, contra um servidor já de pé
 * (npm run casa, ou o endereço em E2E_BASE). Usa o Edge instalado e não o
 * Chromium do Playwright: o Chromium puro não toca H.264, e o teste do player
 * acusaria defeito que não existe.
 *
 * Login e senha vêm de E2E_LOGIN e E2E_SENHA. Não ficam no repositório.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE ?? 'http://127.0.0.1:3000',
    channel: process.env.E2E_CANAL ?? 'msedge',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'computador', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'celular', use: { ...devices['Pixel 7'], channel: process.env.E2E_CANAL ?? 'msedge' } },
    { name: 'tv', use: { viewport: { width: 1920, height: 1080 }, hasTouch: false } },
  ],
});
