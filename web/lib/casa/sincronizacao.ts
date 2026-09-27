/**
 * Sincronizador do acervo: o que mantém o banco atualizado sem a tela
 * esperar por nada.
 *
 * Roda dentro do próprio servidor do Next, cinco segundos depois de subir e
 * depois a cada 30 minutos. Cada ciclo faz, nesta ordem:
 *
 *   1. atualiza as listas da página inicial que passaram de 3 horas;
 *   1b. reconhece os arquivos novos da pasta de casa;
 *   2. puxa o detalhe de todo título dessas listas que ainda não está no
 *      banco, para que o clique no cartaz abra sem ir ao TMDB;
 *   3. pergunta ao TMDB o que mudou desde a última vez (endpoint /changes) e
 *      marca como velho só o que mudou e está guardado aqui;
 *   4. atualiza os velhos e os que passaram de 7 dias, 200 por ciclo.
 *
 * Tudo com no máximo 4 chamadas ao TMDB ao mesmo tempo, bem abaixo do limite
 * dele, e com trava para dois ciclos nunca se sobreporem.
 */

import { acervo, VALIDADE, type NomeDaLista } from './acervo';
import { PRATELEIRAS } from './prateleiras';
import { banco } from './banco';
import { listarBiblioteca, reconhecerPendentes } from '../biblioteca';
import { tmdb, tmdbConfigurado, type Cartaz, type Tipo } from '../tmdb';

const MINUTO = 60_000;
const INTERVALO = 30 * MINUTO;
const INTERVALO_DAS_MUDANCAS = 6 * 60 * MINUTO;
const JANELA_MAXIMA_DO_TMDB = 14 * 24 * 60 * MINUTO;
const SIMULTANEAS = 4;
const POR_CICLO = 200;

export type Relatorio = {
  listas: number;
  puxados: number;
  marcadosVelhos: number;
  atualizados: number;
  falhas: number;
  duracaoMs: number;
};

async function emLotes<T>(itens: T[], trabalho: (item: T) => Promise<unknown>): Promise<number> {
  let falhas = 0;
  let proximo = 0;
  async function operario() {
    while (proximo < itens.length) {
      const item = itens[proximo++] as T;
      try {
        await trabalho(item);
      } catch {
        falhas++;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(SIMULTANEAS, itens.length) }, operario));
  return falhas;
}

let rodando: Promise<Relatorio> | null = null;

/** Roda um ciclo. Se já houver um em andamento, devolve o mesmo. */
export function sincronizar(): Promise<Relatorio> {
  if (!rodando) rodando = ciclo().finally(() => (rodando = null));
  return rodando;
}

async function ciclo(): Promise<Relatorio> {
  const inicio = Date.now();
  const b = banco();
  const relatorio: Relatorio = { listas: 0, puxados: 0, marcadosVelhos: 0, atualizados: 0, falhas: 0, duracaoMs: 0 };

  // 1. Listas velhas.
  const nomes = Object.keys(PRATELEIRAS) as NomeDaLista[];
  const cartazes: Cartaz[] = [];
  for (const nome of nomes) {
    try {
      const velha = acervo.listaEstaVelha(nome);
      cartazes.push(...(velha ? await acervo.atualizarLista(nome) : await acervo.lista(nome)));
      if (velha) relatorio.listas++;
    } catch {
      relatorio.falhas++;
    }
  }

  // 1b. Arquivos da pasta de casa: reconhece os novos e junta os
  // reconhecidos, para o detalhe deles também ficar guardado.
  try {
    await reconhecerPendentes(await listarBiblioteca());
    for (const arquivo of await listarBiblioteca()) if (arquivo.tmdb) cartazes.push(arquivo.tmdb);
  } catch {
    relatorio.falhas++;
  }

  // 2. Detalhe de quem aparece na tela e ainda não está guardado.
  const faltando = new Map<string, Cartaz>();
  for (const c of cartazes) {
    if (!acervo.temTitulo(c.tipo, c.id)) faltando.set(`${c.tipo}:${c.id}`, c);
  }
  const alvos = [...faltando.values()];
  relatorio.falhas += await emLotes(alvos, (c) => acervo.atualizarTitulo(c.tipo, c.id));
  relatorio.puxados = alvos.length;

  // 3. O que mudou no TMDB desde a última conferência.
  const agora = Date.now();
  const ultima = Number(b.lerControle('ultima-conferencia-de-mudancas') ?? 0);
  if (agora - ultima > INTERVALO_DAS_MUDANCAS) {
    const desde = new Date(Math.max(ultima || agora - 24 * 60 * MINUTO, agora - JANELA_MAXIMA_DO_TMDB));
    try {
      for (const tipo of ['filme', 'serie'] as Tipo[]) {
        relatorio.marcadosVelhos += b.marcarVelhos(tipo, await tmdb.mudancas(tipo, desde));
      }
      b.gravarControle('ultima-conferencia-de-mudancas', String(agora));
    } catch {
      relatorio.falhas++;
    }
  }

  // 4. Velhos e vencidos, os mais urgentes primeiro.
  const paraAtualizar = b.titulosParaAtualizar(agora - VALIDADE.titulo, POR_CICLO);
  relatorio.falhas += await emLotes(paraAtualizar, (t) => acervo.atualizarTitulo(t.tipo, t.id));
  relatorio.atualizados = paraAtualizar.length;

  relatorio.duracaoMs = Date.now() - inicio;
  b.gravarControle('ultima-sincronizacao', String(Date.now()));
  b.gravarControle('ultimo-relatorio', JSON.stringify(relatorio));
  return relatorio;
}

const global = globalThis as unknown as { __sincronizadorDaCasa?: boolean };

/**
 * Liga o ciclo periódico. Chamado uma vez pelo instrumentation.ts. Na Vercel
 * não liga: lá o servidor é função que nasce e morre por requisição, e o
 * acervo funciona só com a atualização por trás que cada leitura dispara.
 */
export function iniciarSincronizacao() {
  if (global.__sincronizadorDaCasa || !tmdbConfigurado() || process.env.VERCEL) return;
  if (process.env.CASA_SINCRONIZAR === 'false') return;
  global.__sincronizadorDaCasa = true;

  const rodar = () => {
    sincronizar().catch(() => undefined);
  };
  setTimeout(rodar, 5_000).unref();
  setInterval(rodar, INTERVALO).unref();
}
