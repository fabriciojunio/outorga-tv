'use client';

import { useEffect, useState } from 'react';

type PonteDoApp = { modo(): string; configurar(): void };

/**
 * Só aparece dentro do app de Android: diz se ele está falando com o
 * computador de casa ou com a internet, e abre a configuração do aparelho.
 * No navegador comum, a ponte não existe e isto não mostra nada.
 */
export function RodapeDoApp() {
  const [modo, setModo] = useState<string | null>(null);

  useEffect(() => {
    const ponte = (window as unknown as { OutorgaApp?: PonteDoApp }).OutorgaApp;
    if (ponte) setModo(ponte.modo());
  }, []);

  if (!modo) return null;
  return (
    <p className="casa-credito envolucro">
      {modo === 'casa' ? 'Conectado ao computador de casa.' : 'Conectado pela internet (os vídeos do PC só aparecem em casa).'}{' '}
      <button
        className="botao-texto"
        onClick={() => (window as unknown as { OutorgaApp?: PonteDoApp }).OutorgaApp?.configurar()}
      >
        Configurar aparelho
      </button>
    </p>
  );
}
