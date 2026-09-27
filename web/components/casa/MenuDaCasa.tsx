'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS = [
  { href: '/casa', nome: 'Início' },
  { href: '/casa/ao-vivo', nome: 'Ao vivo' },
  { href: '/casa/series', nome: 'Séries e novelas' },
  { href: '/casa/filmes', nome: 'Filmes' },
  { href: '/casa/esportes', nome: 'Esportes' },
  { href: '/casa/infantil', nome: 'Infantil' },
  { href: '/casa/no-pc', nome: 'No PC' },
];

/** Menu com a página atual acesa, para ninguém se perder. */
export function MenuDaCasa() {
  const caminho = usePathname();
  return (
    <nav className="envolucro casa-menu" aria-label="Menu">
      {ITENS.map((item) => {
        const ativo = item.href === '/casa' ? caminho === '/casa' : caminho.startsWith(item.href);
        return (
          // Sem pré-carregar: cada página do menu é montada no servidor, e
          // buscar as sete a cada tela aberta pesa no PC e na TV Box.
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={ativo ? 'ativo' : ''}
            aria-current={ativo ? 'page' : undefined}
          >
            {item.nome}
          </Link>
        );
      })}
    </nav>
  );
}
