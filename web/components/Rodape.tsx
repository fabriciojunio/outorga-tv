'use client';

import { usePathname } from 'next/navigation';

/** Rodapé da plataforma. O modo de casa tem o crédito do TMDB no lugar dele. */
export function Rodape() {
  if (usePathname().startsWith('/casa')) return null;
  return (
    <footer className="rodape">
      <div className="envolucro espalha">
        <span>Outorga TV. Plataforma de streaming. O catálogo e o direito de exibição são do cliente.</span>
        <span className="mono">v0.2.0</span>
      </div>
    </footer>
  );
}
