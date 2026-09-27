import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_DA_SESSAO, lerSessao } from '@/lib/casa/sessao';

/**
 * Tranca o modo de casa. Página sem sessão vai para a tela de entrar;
 * chamada de API sem sessão recebe 401. A sessão também precisa apontar para
 * um login que ainda existe em CASA_USUARIOS: tirar alguém da lista corta o
 * acesso na hora, sem esperar os 180 dias do cookie.
 */
const LIVRES = new Set(['/casa/entrar', '/api/casa/entrar', '/api/casa/sair', '/api/casa/vivo']);

function loginExiste(login: string): boolean {
  try {
    const lista = JSON.parse(process.env.CASA_USUARIOS ?? '[]') as { login?: string }[];
    return lista.some((u) => u.login === login);
  } catch {
    return false;
  }
}

export async function proxy(pedido: NextRequest) {
  const caminho = pedido.nextUrl.pathname;
  if (LIVRES.has(caminho)) return NextResponse.next();

  const sessao = await lerSessao(pedido.cookies.get(COOKIE_DA_SESSAO)?.value);
  if (sessao && loginExiste(sessao.login)) return NextResponse.next();

  if (caminho.startsWith('/api/')) {
    return NextResponse.json({ mensagem: 'Entre com seu número e senha' }, { status: 401 });
  }
  const destino = new URL('/casa/entrar', pedido.url);
  if (caminho !== '/casa') destino.searchParams.set('voltar', caminho + pedido.nextUrl.search);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ['/casa', '/casa/:caminho*', '/api/casa/:caminho*'],
};
