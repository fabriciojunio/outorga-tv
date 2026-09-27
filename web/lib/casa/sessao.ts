/**
 * Sessão do modo de casa.
 *
 * O cookie carrega login, nome e validade, assinados com HMAC-SHA256 usando
 * CASA_SEGREDO. Não existe tabela de sessão: a assinatura basta, e isso é o
 * que deixa o mesmo login valer em casa e na Vercel, onde não há banco
 * permanente. Usa só Web Crypto para rodar igual no proxy e nas rotas.
 *
 * A sessão dura 180 dias de propósito. Quem vai usar são pessoas que não
 * deveriam precisar digitar senha no controle remoto toda semana.
 */

export const COOKIE_DA_SESSAO = 'outorga_casa';
export const DURACAO_DA_SESSAO_S = 180 * 24 * 60 * 60;

export type Sessao = { login: string; nome: string; expira: number };

const codificador = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64url(texto: string): Uint8Array {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4));
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

function segredo(): string {
  const valor = process.env.CASA_SEGREDO;
  if (!valor || valor.length < 32) {
    throw new Error('CASA_SEGREDO ausente ou curto demais (mínimo de 32 caracteres)');
  }
  return valor;
}

async function chave(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', codificador.encode(segredo()), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function assinarSessao(login: string, nome: string, agora = Date.now()): Promise<string> {
  const sessao: Sessao = { login, nome, expira: Math.floor(agora / 1000) + DURACAO_DA_SESSAO_S };
  const corpo = base64url(codificador.encode(JSON.stringify(sessao)));
  const assinatura = new Uint8Array(await crypto.subtle.sign('HMAC', await chave(), codificador.encode(corpo)));
  return `${corpo}.${base64url(assinatura)}`;
}

/** Devolve a sessão se a assinatura confere e não venceu; senão, null. Nunca lança. */
export async function lerSessao(valor: string | undefined | null, agora = Date.now()): Promise<Sessao | null> {
  if (!valor) return null;
  const [corpo, assinatura, sobra] = valor.split('.');
  if (!corpo || !assinatura || sobra !== undefined) return null;
  try {
    // verify compara em tempo constante; comparar string aqui abriria brecha de tempo.
    const confere = await crypto.subtle.verify(
      'HMAC',
      await chave(),
      deBase64url(assinatura) as BufferSource,
      codificador.encode(corpo),
    );
    if (!confere) return null;
    const sessao = JSON.parse(new TextDecoder().decode(deBase64url(corpo))) as Sessao;
    if (typeof sessao.login !== 'string' || typeof sessao.expira !== 'number') return null;
    return sessao.expira * 1000 > agora ? sessao : null;
  } catch {
    return null;
  }
}
