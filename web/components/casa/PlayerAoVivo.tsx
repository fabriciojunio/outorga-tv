'use client';

import { useEffect, useRef, useState } from 'react';

const ORIGEM_DO_PLAYER = 'https://www.youtube-nocookie.com';

/**
 * Transmissão do YouTube embutida. Algumas transmissões (jogo com direito
 * vendido, por exemplo) proíbem tocar fora do YouTube, e isso só se sabe na
 * hora de tocar. O player avisa por mensagem (erro 101 ou 150); aqui a tela
 * troca para o botão de abrir no YouTube e o servidor anota o bloqueio, para
 * a lista de canais já separar esse vídeo nas próximas horas.
 *
 * Conversa com o player por postMessage, sem carregar o script da API do
 * YouTube: a política de segurança do site só deixa rodar script próprio.
 */
export function PlayerAoVivo({ video, nome }: { video: string; nome: string }) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [origem, setOrigem] = useState<string | null>(null);

  useEffect(() => setOrigem(window.location.origin), []);

  useEffect(() => {
    function aoReceber(evento: MessageEvent) {
      if (evento.origin !== ORIGEM_DO_PLAYER || typeof evento.data !== 'string') return;
      let dado: { event?: string; info?: unknown };
      try {
        dado = JSON.parse(evento.data);
      } catch {
        return;
      }
      if (dado.event === 'onError' && [100, 101, 150, 152, 153].includes(Number(dado.info))) {
        setBloqueado(true);
        void fetch('/api/casa/ao-vivo/bloqueado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video }),
        }).catch(() => undefined);
      }
    }
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [video]);

  // O player só manda eventos depois de receber "listening".
  function aoCarregar() {
    quadro.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), ORIGEM_DO_PLAYER);
  }

  if (bloqueado) {
    return (
      <div className="aviso-bloqueado">
        <p>
          Esta transmissão de <strong>{nome}</strong> não deixa assistir fora do YouTube (costuma ser por direito do jogo).
        </p>
        <a className="botao" href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noreferrer">
          ▶ Abrir no YouTube
        </a>
      </div>
    );
  }

  // O endereço do player leva a origem desta página, que só existe no
  // navegador; montar antes faria o servidor e o navegador discordarem.
  if (!origem) return <div className="quadro-ao-vivo" />;
  return (
    <iframe
      ref={quadro}
      className="quadro-ao-vivo"
      src={`${ORIGEM_DO_PLAYER}/embed/${video}?autoplay=1&rel=0&hl=pt-BR&enablejsapi=1&origin=${encodeURIComponent(origem)}`}
      title={`${nome} ao vivo`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      onLoad={aoCarregar}
    />
  );
}
