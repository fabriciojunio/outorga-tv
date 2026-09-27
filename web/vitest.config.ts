import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    include: ['testes/**/*.test.ts'],
    environment: 'node',
    // O banco do acervo cai para memória quando CASA_BANCO aponta para um
    // lugar que não abre; nos testes ninguém grava em disco.
    env: { CASA_BANCO: ':memory:', CASA_SINCRONIZAR: 'false' },
  },
});
