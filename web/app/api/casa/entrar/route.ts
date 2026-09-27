import { assinarSessao, COOKIE_DA_SESSAO, DURACAO_DA_SESSAO_S } from '@/lib/casa/sessao';
import { bloqueadoAte, conferirSenha, limparErros, registrarErro } from '@/lib/casa/usuarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ehHttps(pedido: Request): boolean {
  return (pedido.headers.get('x-forwarded-proto') ?? new URL(pedido.url).protocol.replace(':', '')) === 'https';
}

export async function POST(pedido: Request) {
  let corpo: { login?: unknown; senha?: unknown };
  try {
    corpo = await pedido.json();
  } catch {
    return Response.json({ mensagem: 'Pedido inválido' }, { status: 400 });
  }

  const login = typeof corpo.login === 'string' ? corpo.login.trim().slice(0, 40) : '';
  const senha = typeof corpo.senha === 'string' ? corpo.senha.slice(0, 200) : '';
  if (!login || !senha) return Response.json({ mensagem: 'Digite o número e a senha' }, { status: 400 });

  // Na Vercel o endereço de quem pede vem neste cabeçalho, posto pela própria
  // Vercel. Em casa ele não existe, e aí o freio fica só no login.
  const ip = (pedido.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim();
  const chaves = [`login:${login}`, ...(ip && process.env.VERCEL ? [`ip:${ip}`] : [])];
  const ate = bloqueadoAte(chaves);
  if (ate) {
    const minutos = Math.ceil((ate - Date.now()) / 60_000);
    return Response.json(
      { mensagem: `Muitas tentativas erradas. Espere ${minutos} minuto${minutos > 1 ? 's' : ''} e tente de novo.` },
      { status: 429, headers: { 'Retry-After': String(minutos * 60) } },
    );
  }

  const usuario = await conferirSenha(login, senha);
  if (!usuario) {
    registrarErro(chaves);
    return Response.json({ mensagem: 'Número ou senha não conferem' }, { status: 401 });
  }
  limparErros(chaves);

  const cookie = [
    `${COOKIE_DA_SESSAO}=${await assinarSessao(usuario.login, usuario.nome)}`,
    'Path=/',
    `Max-Age=${DURACAO_DA_SESSAO_S}`,
    'HttpOnly',
    'SameSite=Lax',
    // Em casa o endereço é http://192.168..., e cookie Secure não iria.
    ...(ehHttps(pedido) ? ['Secure'] : []),
  ].join('; ');

  return Response.json({ nome: usuario.nome }, { headers: { 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } });
}
