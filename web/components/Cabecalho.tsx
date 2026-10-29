'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useNoNavegador } from '@/lib/useNoNavegador';
import { encerrarSessao, sessaoGuardada, vitrine, type Identidade } from '@/lib/api';

/**
 * Barra de topo. Le a identidade do serviço na API para se pintar com a marca
 * do cliente: é o que faz a mesma base servir a serviços diferentes.
 */
export function Cabecalho() {
  const caminho = usePathname();
  const [identidade, setIdentidade] = useState<Identidade | null>(null);

  const naCasa = caminho.startsWith('/casa');

  useEffect(() => {
    // No modo de casa esta barra nem aparece, e a API da plataforma pode não
    // estar de pé no PC de casa: não há por que chamá-la.
    if (naCasa) return;
    vitrine.identidade().then(setIdentidade).catch(() => setIdentidade(null));
  }, [naCasa]);

  // Relido a cada renderização, e a navegação renderiza de novo: entrar ou sair
  // aparece na troca de página, como antes. Em outra aba, pelo evento storage.
  const situacao = useNoNavegador(
    () => {
      const sessao = sessaoGuardada();
      const opera =
        sessao?.papeis?.some((p) => ['DONO', 'EDITOR', 'SUPORTE', 'ADMIN_PLATAFORMA'].includes(p)) ?? false;
      return `${sessao !== null}|${opera}`;
    },
    'false|false',
    true,
  );
  const [entrouTexto, operadorTexto] = situacao.split('|');
  const entrou = entrouTexto === 'true';
  const operador = operadorTexto === 'true';

  const nome = identidade?.nome ?? 'Outorga TV';

  // O modo de casa tem a barra dele. Esta aqui, com "Entrar" e "Painel" da
  // plataforma, só confundiria quem está no sofá com o controle na mão.
  if (naCasa) return null;

  return (
    <>
      <header className="cabecalho">
        <div className="envolucro">
          <Link href="/" className="marca">
            <span className="traco" />
            {nome}
          </Link>
          <nav className="navegacao">
            <Link href="/" className={`nav-catalogo ${caminho === '/' ? 'ativo' : ''}`}>
              Catálogo
            </Link>
            <Link href="/casa" className={caminho.startsWith('/casa') ? 'ativo' : ''}>
              Em casa
            </Link>
            <Link href="/baixar" className={caminho.startsWith('/baixar') ? 'ativo' : ''}>
              Baixar apps
            </Link>
            {operador && (
              <Link href="/painel" className={caminho.startsWith('/painel') ? 'ativo' : ''}>
                Painel
              </Link>
            )}
            {entrou ? (
              <>
                <Link href="/conta" className={caminho.startsWith('/conta') ? 'ativo' : ''}>
                  Minha conta
                </Link>
                <button
                  className="botao secundario"
                  onClick={() => {
                    encerrarSessao();
                    // Recarga completa de propósito: ao sair, nada da sessão fica na memória da página.
                    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                    window.location.href = '/';
                  }}
                >
                  Sair
                </button>
              </>
            ) : (
              <Link href="/entrar" className="botao">
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>
      {/* No modo de casa nada é fictício: o catálogo é o do TMDB e o vídeo é o do seu PC. */}
      {!caminho.startsWith('/casa') && <FaixaDeDemonstracao />}
    </>
  );
}

/**
 * A faixa existe para que ninguém confunda a demonstração com um serviço em
 * operação. Some sozinha quando o ambiente sai do modo de demonstração.
 */
function FaixaDeDemonstracao() {
  // A variável NEXT_PUBLIC_ é fixada no build, igual no servidor e no navegador.
  if (process.env.NEXT_PUBLIC_DEMONSTRACAO === 'false') return null;

  return (
    <div className="faixa-demonstracao">
      Ambiente de demonstração. O catálogo é fictício, o vídeo é um arquivo de teste e nenhuma
      cobrança é feita de verdade.
    </div>
  );
}
