import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { BotaoSair } from '@/components/casa/BotaoSair';
import { MenuDaCasa } from '@/components/casa/MenuDaCasa';
import { NavegacaoPorControle } from '@/components/casa/NavegacaoPorControle';
import { RodapeDoApp } from '@/components/casa/RodapeDoApp';
import { primeiroNome, quemEsta } from '@/lib/casa/quem';

export const metadata: Metadata = {
  title: { default: 'Em casa · Outorga TV', template: '%s · Outorga TV' },
  description: 'Filmes, séries, canais e os vídeos do seu PC, no computador, no celular e na TV',
};

export const viewport: Viewport = {
  themeColor: '#0d0f14',
  colorScheme: 'dark',
};

export default async function LayoutDaCasa({ children }: { children: React.ReactNode }) {
  const sessao = await quemEsta();

  return (
    <div className="casa">
      <NavegacaoPorControle />
      <header className="casa-topo">
        <div className="envolucro casa-topo-linha">
          <Link href="/casa" className="marca">
            <span className="traco" />
            Outorga TV
          </Link>
          {sessao && (
            <>
              <form action="/casa/busca" role="search" className="casa-busca">
                <input
                  name="q"
                  type="search"
                  placeholder="Buscar filme ou série"
                  aria-label="Buscar filme ou série"
                  enterKeyHint="search"
                  autoComplete="off"
                />
              </form>
              <span className="casa-usuario">
                Olá, {primeiroNome(sessao.nome)} · <BotaoSair />
              </span>
            </>
          )}
        </div>
        {sessao && <MenuDaCasa />}
      </header>
      {children}
      <RodapeDoApp />
      <p className="casa-credito envolucro">
        Dados de filmes e séries fornecidos pelo{' '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          TMDB
        </a>
        . Este produto usa a API do TMDB, mas não é endossado nem certificado por ele.
      </p>
    </div>
  );
}
