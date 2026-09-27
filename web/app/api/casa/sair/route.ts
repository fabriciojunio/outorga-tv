import { COOKIE_DA_SESSAO } from '@/lib/casa/sessao';

/** Apaga o cookie e manda para a tela de entrar. 303 faz o navegador seguir com GET. */
export function POST(pedido: Request) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL('/casa/entrar', pedido.url).pathname,
      'Set-Cookie': `${COOKIE_DA_SESSAO}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    },
  });
}
