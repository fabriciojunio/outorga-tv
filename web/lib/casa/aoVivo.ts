/**
 * Descobre quais canais do YouTube estão transmitindo agora.
 *
 * A página /channel/<id>/live do YouTube aponta, no link canônico, para o
 * vídeo da transmissão quando o canal está ao vivo, e para o próprio canal
 * quando não está. É leitura de página pública, sem chave de API e sem cota.
 *
 * O resultado fica no banco por 10 minutos, e a página nunca espera essa
 * consulta mais que o necessário: um canal que não responde em 6 segundos
 * conta como fora do ar, e o resto segue.
 */

import { banco } from './banco';
import { NO_APP, type CanalNoApp } from './canais';

export type Transmissao = CanalNoApp & { video: string | null; titulo: string | null; bloqueado?: boolean };

const VALIDADE = 10 * 60_000;
const BLOQUEIO = 6 * 60 * 60_000;

/** Vídeo que o player avisou que não toca embutido. Vale por 6 horas. */
export function marcarBloqueado(video: string) {
  banco().gravarCache('ao-vivo-bloqueado', video, true);
}

function estaBloqueado(video: string): boolean {
  const g = banco().lerCache<boolean>('ao-vivo-bloqueado', video);
  return Boolean(g && Date.now() - g.atualizadoEm < BLOQUEIO);
}

async function consultar(canal: CanalNoApp): Promise<Transmissao> {
  try {
    const resposta = await fetch(`https://www.youtube.com/channel/${canal.canal}/live`, {
      headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140 Safari/537.36' },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    const html = await resposta.text();
    const video = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1] ?? null;
    // Live agendada também tem link canônico para o vídeo, mas ainda não
    // começou: o YouTube marca como LIVE_STREAM_OFFLINE ou isUpcoming.
    const agendada = /LIVE_STREAM_OFFLINE|"isUpcoming":true/.test(html);
    const aoVivo = video !== null && /"isLive":true/.test(html) && !agendada;
    const titulo = html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? null;
    return { ...canal, video: aoVivo ? video : null, titulo: aoVivo ? decodificar(titulo) : null };
  } catch {
    return { ...canal, video: null, titulo: null };
  }
}

function decodificar(texto: string | null): string | null {
  if (!texto) return null;
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

let emAndamento: Promise<Transmissao[]> | null = null;

function atualizar(): Promise<Transmissao[]> {
  if (!emAndamento) {
    emAndamento = Promise.all(NO_APP.map(consultar))
      .then((lista) => {
        banco().gravarCache('ao-vivo', 'youtube', lista);
        return lista;
      })
      .finally(() => (emAndamento = null));
  }
  return emAndamento;
}

/**
 * Mesma regra do acervo: guardado responde na hora e atualiza por trás. O
 * bloqueio é aplicado na leitura, para valer no minuto em que o player avisou.
 */
export async function transmissoes(): Promise<Transmissao[]> {
  const lista = await transmissoesGuardadas();
  return lista.map((t) => ({ ...t, bloqueado: t.video ? estaBloqueado(t.video) : false }));
}

async function transmissoesGuardadas(): Promise<Transmissao[]> {
  const guardado = banco().lerCache<Transmissao[]>('ao-vivo', 'youtube');
  // Se a lista de canais mudou no arquivo, o guardado não serve mais.
  const mesmaLista = guardado && guardado.dados.map((t) => t.canal).join() === NO_APP.map((c) => c.canal).join();
  if (guardado && mesmaLista) {
    if (Date.now() - guardado.atualizadoEm > VALIDADE) atualizar().catch(() => undefined);
    return guardado.dados;
  }
  return atualizar();
}
