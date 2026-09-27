'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { guardarProgresso, progressoDe } from '@/lib/casa/progresso';

type Props = {
  id: string;
  nome: string;
  capa: string | null;
  fundo: string | null;
  temLegenda: boolean;
  proximo: { id: string; nome: string } | null;
};

const PULO = 10;

/**
 * Player dos vídeos da pasta de casa. Volta de onde parou, guarda a posição a
 * cada cinco segundos e responde ao controle remoto: esquerda e direita
 * pulam 10 segundos, OK pausa, e as teclas de mídia do controle funcionam.
 */
export function PlayerLocal({ id, nome, capa, fundo, temLegenda, proximo }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [retomadoDe, setRetomadoDe] = useState<number | null>(null);
  const [terminou, setTerminou] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;

    const salvar = () => {
      if (!Number.isFinite(v.duration) || v.duration === 0) return;
      guardarProgresso({ id, nome, capa, posicao: v.currentTime, duracao: v.duration, em: Date.now() });
    };

    const aoCarregar = () => {
      const anterior = progressoDe(id);
      if (anterior && anterior.posicao > 10 && anterior.posicao < v.duration - 30) {
        v.currentTime = anterior.posicao;
        setRetomadoDe(anterior.posicao);
      }
      v.play().catch(() => undefined);
    };

    const aoFalhar = () => {
      const codigo = v.error?.code;
      setErro(
        codigo === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || codigo === MediaError.MEDIA_ERR_DECODE
          ? 'Este aparelho não consegue tocar o formato deste arquivo. MP4 com vídeo H.264 e áudio AAC toca em qualquer lugar; MKV e HEVC dependem do aparelho.'
          : 'O vídeo parou de chegar. Confira se o PC com a pasta continua ligado e na mesma rede.',
      );
    };

    const aoTerminar = () => {
      salvar();
      setTerminou(true);
    };

    const relogio = window.setInterval(() => {
      if (!v.paused) salvar();
    }, 5000);

    v.addEventListener('loadedmetadata', aoCarregar);
    v.addEventListener('pause', salvar);
    v.addEventListener('error', aoFalhar);
    v.addEventListener('ended', aoTerminar);
    window.addEventListener('pagehide', salvar);
    palco.current?.focus({ preventScroll: true });

    return () => {
      salvar();
      window.clearInterval(relogio);
      v.removeEventListener('loadedmetadata', aoCarregar);
      v.removeEventListener('pause', salvar);
      v.removeEventListener('error', aoFalhar);
      v.removeEventListener('ended', aoTerminar);
      window.removeEventListener('pagehide', salvar);
    };
  }, [id, nome, capa]);

  function aoApertar(evento: React.KeyboardEvent) {
    const v = video.current;
    if (!v) return;
    const tecla = evento.key;
    const codigo = evento.keyCode;

    if (tecla === 'ArrowRight' || tecla === 'MediaFastForward' || codigo === 417) {
      v.currentTime = Math.min(v.duration || Infinity, v.currentTime + PULO);
    } else if (tecla === 'ArrowLeft' || tecla === 'MediaRewind' || codigo === 412) {
      v.currentTime = Math.max(0, v.currentTime - PULO);
    } else if (tecla === 'Enter' || tecla === ' ' || tecla === 'MediaPlayPause' || codigo === 10252) {
      if (v.paused) void v.play();
      else v.pause();
    } else if (tecla === 'MediaPlay' || codigo === 415) {
      void v.play();
    } else if (tecla === 'MediaPause' || codigo === 19) {
      v.pause();
    } else if (tecla === 'f' || tecla === 'F') {
      telaCheia();
    } else {
      return;
    }
    evento.preventDefault();
  }

  function telaCheia() {
    const alvo = palco.current;
    if (!alvo) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (alvo.requestFullscreen) void alvo.requestFullscreen().catch(() => undefined);
    // iPhone não deixa div em tela cheia, só o próprio vídeo.
    else (video.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.();
  }

  const minutos = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="player-casa">
      <div
        ref={palco}
        className="palco palco-casa"
        tabIndex={0}
        onKeyDown={aoApertar}
        aria-label={`Player: ${nome}. Setas pulam 10 segundos, OK pausa.`}
      >
        <video
          ref={video}
          src={`/api/casa/video/${id}`}
          controls
          playsInline
          preload="metadata"
          poster={fundo ?? undefined}
          tabIndex={-1}
        >
          {temLegenda && <track kind="subtitles" src={`/api/casa/legenda/${id}`} srcLang="pt" label="Português" default />}
        </video>
      </div>

      {erro && <div className="aviso erro">{erro}</div>}
      {retomadoDe !== null && !erro && (
        <p className="apagado">
          Voltando de {minutos(retomadoDe)}.{' '}
          <button
            className="botao-texto"
            onClick={() => {
              if (video.current) video.current.currentTime = 0;
              setRetomadoDe(null);
            }}
          >
            Começar do início
          </button>
        </p>
      )}

      <div className="acoes">
        <button className="botao secundario" onClick={telaCheia}>
          Tela cheia
        </button>
        {proximo && (
          <Link href={`/casa/tocar/${proximo.id}`} className={`botao ${terminou ? '' : 'secundario'}`}>
            Próximo: {proximo.nome}
          </Link>
        )}
      </div>
    </div>
  );
}
