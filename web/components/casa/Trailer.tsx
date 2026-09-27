'use client';

import { useEffect, useRef, useState } from 'react';
import { registrarFechamento } from '@/lib/casa/voltar';

/**
 * Trailer do YouTube numa camada por cima da página. Usa o domínio
 * youtube-nocookie, que não grava cookie de rastreamento enquanto ninguém
 * dá play, e só carrega o iframe quando a pessoa pede.
 */
export function Trailer({ chave, nome }: { chave: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);
  const abrir = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    fechar.current?.focus();
    // O voltar (do controle, do celular ou do navegador) fecha o trailer
    // antes de sair da página.
    const tirar = registrarFechamento(() => setAberto(false));
    function aoApertar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      setAberto(false);
    }
    window.addEventListener('keydown', aoApertar);
    return () => {
      tirar();
      window.removeEventListener('keydown', aoApertar);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) abrir.current?.focus({ preventScroll: true });
  }, [aberto]);

  return (
    <>
      <button ref={abrir} className="botao secundario" onClick={() => setAberto(true)}>
        ▶ Ver trailer
      </button>
      {aberto && (
        <div className="camada-trailer" role="dialog" aria-modal="true" aria-label={`Trailer de ${nome}`}>
          <div className="camada-trailer-quadro">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(chave)}?autoplay=1&rel=0&cc_load_policy=1&hl=pt-BR`}
              title={`Trailer de ${nome}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
          <button ref={fechar} className="botao" onClick={() => setAberto(false)}>
            Fechar trailer
          </button>
        </div>
      )}
    </>
  );
}
