#!/usr/bin/env node
/**
 * Cria ou troca a senha de um usuário do modo de casa.
 *
 *   npm run casa:usuario -- 4 "Nome Completo" SenhaNova123
 *
 * Lê o CASA_USUARIOS atual do web/.env.local, troca (ou acrescenta) o login
 * e grava de volta. A senha em texto não fica em lugar nenhum: vai só o hash
 * scrypt, no mesmo formato que lib/casa/usuarios.ts confere.
 *
 * Com --so-imprimir, não grava: só mostra o JSON, para colar na Vercel.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const soImprimir = args.includes('--so-imprimir');
const [login, nome, senha] = args.filter((a) => a !== '--so-imprimir');

if (!login || !nome || !senha) {
  console.error('Uso: npm run casa:usuario -- <login> "<nome completo>" <senha> [--so-imprimir]');
  process.exit(1);
}
if (senha.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.');
  process.exit(1);
}

const sal = randomBytes(16);
const hash = `scrypt:${sal.toString('base64url')}:${scryptSync(senha, sal, 32).toString('base64url')}`;

const arquivo = path.resolve(process.cwd(), '.env.local');
const texto = existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : '';
const linhaAtual = texto.split(/\r?\n/).find((l) => l.startsWith('CASA_USUARIOS='));
let lista = [];
try {
  lista = linhaAtual ? JSON.parse(linhaAtual.slice('CASA_USUARIOS='.length).replace(/^'|'$/g, '')) : [];
} catch {
  console.error('CASA_USUARIOS no .env.local não é um JSON válido. Corrija antes.');
  process.exit(1);
}

lista = [...lista.filter((u) => u.login !== login), { login, nome, hash }].sort((a, b) =>
  a.login.localeCompare(b.login, 'pt-BR', { numeric: true }),
);
const json = JSON.stringify(lista);

if (soImprimir) {
  console.log(json);
  process.exit(0);
}

// Aspas simples: o dotenv do Next lê o valor como texto puro, sem mexer no $.
const linhaNova = `CASA_USUARIOS='${json}'`;
const resultado = linhaAtual ? texto.replace(linhaAtual, linhaNova) : `${texto.trimEnd()}\n${linhaNova}\n`;
writeFileSync(arquivo, resultado);
console.log(`Usuário ${login} (${nome}) gravado em .env.local. Reinicie o servidor para valer.`);
