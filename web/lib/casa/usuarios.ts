/**
 * Quem pode entrar no modo de casa.
 *
 * Os usuários ficam em CASA_USUARIOS, um JSON com login, nome e o hash
 * scrypt da senha. Senha em texto nunca é guardada. Para criar ou trocar uma
 * senha: `npm run casa:usuario -- <login> "<nome>" <senha>`, que imprime a
 * linha pronta para colar.
 *
 * Fica em variável de ambiente, e não no banco, para valer igual no PC de
 * casa e na Vercel sem precisar de banco permanente lá.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

export type Usuario = { login: string; nome: string; hash: string };

export function usuarios(): Usuario[] {
  try {
    const lidos = JSON.parse(process.env.CASA_USUARIOS ?? '[]') as Usuario[];
    return Array.isArray(lidos) ? lidos.filter((u) => u.login && u.nome && u.hash) : [];
  } catch {
    return [];
  }
}

export function usuarioPorLogin(login: string): Usuario | null {
  return usuarios().find((u) => u.login === login) ?? null;
}

export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(senha, sal, 32);
  return `scrypt:${sal.toString('base64url')}:${hash.toString('base64url')}`;
}

// Hash de mentira usado quando o login não existe: a conta gasta o mesmo
// tempo, e quem tenta não descobre pelo relógio quais logins são válidos.
// O separador é ":" e não "$" porque o Next expande "$" nos arquivos .env.
const HASH_FALSO = 'scrypt:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function conferirSenha(login: string, senha: string): Promise<Usuario | null> {
  const usuario = usuarioPorLogin(login);
  const [, salTexto, hashTexto] = (usuario?.hash ?? HASH_FALSO).split(':');
  if (!salTexto || !hashTexto) return null;
  const esperado = Buffer.from(hashTexto, 'base64url');
  const calculado = await scrypt(senha, Buffer.from(salTexto, 'base64url'), esperado.length || 32);
  const confere = esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
  return usuario && confere ? usuario : null;
}

// ---------- Freio contra tentativa de senha ----------

const BLOQUEIO_MS = 15 * 60_000;
const erros = new Map<string, { vezes: number; ate: number }>();

/**
 * Quantos erros cada tipo de chave tolera. Cinco no mesmo login. Por
 * endereço, vinte, e só quando o endereço é conhecido (atrás da Vercel): em
 * casa todo mundo chega pelo mesmo caminho, e um bloqueio por endereço
 * trancaria a família inteira por causa de uma pessoa errando a senha.
 */
function limite(chave: string): number {
  return chave.startsWith('ip:') ? 20 : 5;
}

/** Com login de um dígito, sem isto bastaria testar senhas à vontade. */
export function bloqueadoAte(chaves: string[], agora = Date.now()): number | null {
  let maior = 0;
  for (const chave of chaves) {
    const registro = erros.get(chave);
    if (registro && registro.vezes >= limite(chave) && registro.ate > agora) maior = Math.max(maior, registro.ate);
  }
  return maior || null;
}

export function registrarErro(chaves: string[], agora = Date.now()) {
  for (const chave of chaves) {
    const anterior = erros.get(chave);
    const vezes = anterior && anterior.ate > agora ? anterior.vezes + 1 : 1;
    erros.set(chave, { vezes, ate: agora + BLOQUEIO_MS });
  }
  if (erros.size > 5000) {
    for (const [chave, registro] of erros) if (registro.ate <= agora) erros.delete(chave);
  }
}

export function limparErros(chaves: string[]) {
  for (const chave of chaves) erros.delete(chave);
}
