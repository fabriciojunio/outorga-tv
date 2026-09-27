/**
 * Jogos de hoje e de amanhã, com placar ao vivo.
 *
 * Os dados vêm do placar público da ESPN (site.web.api.espn.com), que não
 * pede chave. Ele não diz em qual canal brasileiro cada jogo passa, então o
 * "onde assistir" é o da competição, configurado aqui. Quando a CazéTV está
 * transmitindo um dos jogos, a página cruza os nomes e oferece tocar dentro
 * do app.
 *
 * Para acrescentar uma competição, basta uma linha em COMPETICOES. O código
 * dela é o que aparece no endereço da ESPN (espn.com.br/futebol/liga/_/nome/bra.1).
 */

import { banco } from './banco';

export type Competicao = { codigo: string; nome: string; esporte: 'futebol' | 'basquete'; ondePassa: string[] };

export const COMPETICOES: Competicao[] = [
  { codigo: 'soccer/bra.1', nome: 'Brasileirão Série A', esporte: 'futebol', ondePassa: ['Globo', 'SporTV', 'Premiere', 'Record', 'CazéTV'] },
  { codigo: 'soccer/bra.2', nome: 'Brasileirão Série B', esporte: 'futebol', ondePassa: ['ESPN / Disney+', 'SporTV', 'Premiere', 'Band'] },
  { codigo: 'soccer/bra.copa_do_brazil', nome: 'Copa do Brasil', esporte: 'futebol', ondePassa: ['Globo', 'SporTV', 'Premiere', 'Prime Video'] },
  { codigo: 'soccer/conmebol.libertadores', nome: 'Libertadores', esporte: 'futebol', ondePassa: ['Globo', 'ESPN / Disney+', 'Paramount+'] },
  { codigo: 'soccer/conmebol.sudamericana', nome: 'Sul-Americana', esporte: 'futebol', ondePassa: ['ESPN / Disney+', 'Paramount+'] },
  { codigo: 'soccer/uefa.champions', nome: 'Champions League', esporte: 'futebol', ondePassa: ['TNT Sports / Max', 'SBT', 'Prime Video'] },
  { codigo: 'soccer/eng.1', nome: 'Campeonato Inglês', esporte: 'futebol', ondePassa: ['ESPN / Disney+'] },
  { codigo: 'soccer/esp.1', nome: 'Campeonato Espanhol', esporte: 'futebol', ondePassa: ['ESPN / Disney+'] },
  { codigo: 'soccer/ita.1', nome: 'Campeonato Italiano', esporte: 'futebol', ondePassa: ['ESPN / Disney+'] },
  { codigo: 'basketball/nba', nome: 'NBA', esporte: 'basquete', ondePassa: ['ESPN / Disney+', 'Prime Video', 'NBA League Pass', 'CazéTV'] },
  { codigo: 'basketball/wnba', nome: 'WNBA', esporte: 'basquete', ondePassa: ['ESPN / Disney+', 'NBA League Pass'] },
];

export type Time = { nome: string; logo: string | null; placar: string | null };

export type Jogo = {
  id: string;
  competicao: string;
  esporte: Competicao['esporte'];
  ondePassa: string[];
  inicio: string;
  estado: 'antes' | 'agora' | 'fim';
  detalhe: string;
  casa: Time;
  fora: Time;
};

type Cru = {
  events?: {
    id: string;
    date: string;
    competitions: {
      status: { type: { state: string; shortDetail: string; detail?: string } };
      competitors: { homeAway: string; score?: string; team: { displayName: string; logo?: string } }[];
    }[];
  }[];
};

/** Data no fuso de Brasília, no formato da ESPN (AAAAMMDD). */
export function diaEmBrasilia(deslocamentoEmDias = 0, agora = new Date()): string {
  const data = new Date(agora.getTime() + deslocamentoEmDias * 86_400_000);
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
  return partes.replace(/-/g, '');
}

function traduzirDetalhe(estado: Jogo['estado'], detalhe: string): string {
  if (estado === 'fim') return 'Encerrado';
  if (estado === 'antes') return '';
  return detalhe
    .replace(/^HT$/i, 'Intervalo')
    .replace(/^INT$/i, 'Intervalo')
    .replace(/Halftime/i, 'Intervalo')
    .replace(/(\d)(st|nd|rd|th) Quarter/i, '$1º quarto')
    .replace(/End of (\d)(st|nd|rd|th)/i, 'Fim do $1º quarto')
    .replace(/^OT$/i, 'Prorrogação');
}

async function buscarCompeticao(c: Competicao, dia: string): Promise<Jogo[]> {
  const resposta = await fetch(
    `https://site.web.api.espn.com/apis/site/v2/sports/${c.codigo}/scoreboard?lang=pt&region=br&dates=${dia}`,
    { cache: 'no-store', signal: AbortSignal.timeout(8000) },
  );
  if (!resposta.ok) throw new Error(`ESPN ${resposta.status} em ${c.codigo}`);
  const cru = (await resposta.json()) as Cru;

  return (cru.events ?? []).flatMap((evento) => {
    const disputa = evento.competitions[0];
    if (!disputa) return [];
    const estado: Jogo['estado'] =
      disputa.status.type.state === 'in' ? 'agora' : disputa.status.type.state === 'post' ? 'fim' : 'antes';
    const time = (lado: string): Time => {
      const t = disputa.competitors.find((x) => x.homeAway === lado);
      return { nome: t?.team.displayName ?? '?', logo: t?.team.logo ?? null, placar: estado === 'antes' ? null : (t?.score ?? null) };
    };
    return [
      {
        id: `${c.codigo}:${evento.id}`,
        competicao: c.nome,
        esporte: c.esporte,
        ondePassa: c.ondePassa,
        inicio: evento.date,
        estado,
        detalhe: traduzirDetalhe(estado, disputa.status.type.shortDetail),
        casa: time('home'),
        fora: time('away'),
      },
    ];
  });
}

let emAndamento: Promise<Jogo[]> | null = null;

async function atualizar(): Promise<Jogo[]> {
  if (!emAndamento) {
    emAndamento = (async () => {
      const dias = [diaEmBrasilia(0), diaEmBrasilia(1)];
      const tentativas = await Promise.allSettled(
        COMPETICOES.flatMap((c) => dias.map((dia) => buscarCompeticao(c, dia))),
      );
      const jogos = tentativas.flatMap((t) => (t.status === 'fulfilled' ? t.value : []));
      if (jogos.length === 0 && tentativas.every((t) => t.status === 'rejected')) {
        throw new Error('ESPN fora do ar');
      }
      const unicos = [...new Map(jogos.map((j) => [j.id, j])).values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
      banco().gravarCache('esportes', `jogos:${dias[0]}`, unicos);
      return unicos;
    })().finally(() => (emAndamento = null));
  }
  return emAndamento;
}

/**
 * Com jogo rolando, o placar guardado vale um minuto; sem jogo, dez. Mesma
 * regra do resto: o guardado responde na hora e a atualização vem por trás.
 */
export async function jogos(): Promise<{ lista: Jogo[]; atualizadoEm: number | null }> {
  // A data entra na chave: à meia-noite o guardado de ontem deixa de servir.
  const guardado = banco().lerCache<Jogo[]>('esportes', `jogos:${diaEmBrasilia(0)}`);
  if (guardado) {
    const temAoVivo = guardado.dados.some((j) => j.estado === 'agora');
    const validade = temAoVivo ? 60_000 : 10 * 60_000;
    if (Date.now() - guardado.atualizadoEm > validade) atualizar().catch(() => undefined);
    return { lista: guardado.dados, atualizadoEm: guardado.atualizadoEm };
  }
  try {
    return { lista: await atualizar(), atualizadoEm: Date.now() };
  } catch {
    return { lista: [], atualizadoEm: null };
  }
}

/** A CazéTV costuma pôr os dois times no título da live. */
export function tituloFalaDoJogo(titulo: string, jogo: Jogo): boolean {
  const limpo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const t = limpo(titulo);
  const palavra = (nome: string) => limpo(nome).split(/\s+/).filter((p) => p.length > 3);
  const cita = (nome: string) => palavra(nome).some((p) => t.includes(p));
  return cita(jogo.casa.nome) && cita(jogo.fora.nome);
}
