/**
 * Biblioteca de casa: os vídeos de uma pasta do PC, servidos pela rede local.
 *
 * A pasta vem de BIBLIOTECA_DIR. Sem ela, a biblioteca simplesmente não
 * existe, que é o caso do site publicado na Vercel. O arquivo é identificado
 * pelo caminho relativo à pasta, codificado em base64url, e toda leitura
 * confere de novo que o caminho resolvido continua dentro dela: um id montado
 * à mão com "../" não sai para o resto do disco.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { acervo } from './casa/acervo';
import type { Cartaz } from './tmdb';

export const EXTENSOES_DE_VIDEO: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
};

const PROFUNDIDADE_MAXIMA = 5;

export type ArquivoDeVideo = {
  id: string;
  relativo: string;
  nome: string;
  ano: number | null;
  temporada: number | null;
  episodio: number | null;
  tamanhoBytes: number;
  temLegenda: boolean;
  /** Pelo nome do arquivo e pela legenda ao lado: "dublado", "dual", "leg"... */
  idioma: 'dublado' | 'legendado' | null;
  tmdb: Cartaz | null;
};

export function idiomaPeloNome(nome: string, temLegenda: boolean): ArquivoDeVideo['idioma'] {
  if (/\b(dublado|dub|dual|nacional|pt-?br\s?audio)\b/i.test(nome)) return 'dublado';
  if (/\b(legendado|leg|legendas?)\b/i.test(nome) || temLegenda) return 'legendado';
  return null;
}

export function pastaDaBiblioteca(): string | null {
  const pasta = process.env.BIBLIOTECA_DIR?.trim();
  return pasta ? path.resolve(pasta) : null;
}

export function codificar(relativo: string): string {
  return Buffer.from(relativo, 'utf8').toString('base64url');
}

/**
 * Devolve o caminho absoluto de um id, ou null se o id não aponta para um
 * vídeo dentro da pasta. É a única porta de entrada para ler arquivo.
 */
export function caminhoSeguro(id: string): string | null {
  const pasta = pastaDaBiblioteca();
  if (!pasta || !/^[A-Za-z0-9_-]+$/.test(id)) return null;

  const relativo = Buffer.from(id, 'base64url').toString('utf8');
  const absoluto = path.resolve(pasta, relativo);
  const dentro = absoluto.startsWith(pasta + path.sep);
  if (!dentro || !(path.extname(absoluto).toLowerCase() in EXTENSOES_DE_VIDEO)) return null;
  return absoluto;
}

/** A legenda é o .srt ou .vtt com o mesmo nome do vídeo, ao lado dele. */
export async function legendaDe(video: string): Promise<string | null> {
  const base = video.slice(0, -path.extname(video).length);
  for (const candidato of [`${base}.pt-BR.srt`, `${base}.pt.srt`, `${base}.srt`, `${base}.vtt`]) {
    try {
      await fs.access(candidato);
      return candidato;
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

/**
 * Tira do nome do arquivo o que é ruído de lançamento e fica com nome, ano,
 * temporada e episódio. "Duna.Parte.Dois.2024.1080p.WEB-DL.mkv" vira
 * { nome: "Duna Parte Dois", ano: 2024 }.
 */
export function lerNome(arquivo: string): Pick<ArquivoDeVideo, 'nome' | 'ano' | 'temporada' | 'episodio'> {
  let nome = path.basename(arquivo, path.extname(arquivo)).replace(/[._]+/g, ' ');

  let temporada: number | null = null;
  let episodio: number | null = null;
  const marcaDeEpisodio = nome.match(/\bS(\d{1,2})\s?E(\d{1,3})\b/i) ?? nome.match(/\b(\d{1,2})x(\d{2})\b/);
  if (marcaDeEpisodio && marcaDeEpisodio.index !== undefined) {
    temporada = Number(marcaDeEpisodio[1]);
    episodio = Number(marcaDeEpisodio[2]);
    nome = nome.slice(0, marcaDeEpisodio.index);
  }

  // O ano de lançamento é o último ano do nome, não o primeiro: em
  // "Blade Runner 2049 2017" o 2049 é parte do título.
  let ano: number | null = null;
  const anos = [...nome.matchAll(/[\s(\[]((?:19|20)\d{2})(?=[\s)\]]|$)/g)].filter((m) => (m.index ?? 0) > 0);
  const marcaDeAno = anos[anos.length - 1];
  if (marcaDeAno?.index !== undefined && marcaDeAno[1]) {
    ano = Number(marcaDeAno[1]);
    nome = nome.slice(0, marcaDeAno.index);
  }

  nome = nome
    .replace(/\b(2160p|1080p|720p|480p|4k|hdr|x26[45]|h\.?26[45]|hevc|web-?dl|web-?rip|bluray|brrip|dual|dublado|legendado|nacional)\b.*$/i, '')
    .replace(/[\s\-–([]+$/g, '')
    .trim();

  return { nome: nome || path.basename(arquivo), ano, temporada, episodio };
}

async function varrer(pasta: string, raiz: string, profundidade: number, achados: string[]) {
  if (profundidade > PROFUNDIDADE_MAXIMA) return;
  let entradas;
  try {
    entradas = await fs.readdir(pasta, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entrada of entradas) {
    if (entrada.name.startsWith('.')) continue;
    const completo = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      await varrer(completo, raiz, profundidade + 1, achados);
    } else if (
      entrada.isFile() &&
      path.extname(entrada.name).toLowerCase() in EXTENSOES_DE_VIDEO &&
      !/\bsample\b/i.test(entrada.name)
    ) {
      achados.push(path.relative(raiz, completo));
    }
  }
}

type Varredura = Omit<ArquivoDeVideo, 'tmdb'>;

// A varredura da pasta fica guardada por um minuto. Abrir a página inicial
// em três aparelhos seguidos não lê o disco três vezes.
const VALIDADE_DA_VARREDURA = 60_000;
let ultimaVarredura: { em: number; pasta: string; itens: Promise<Varredura[]> } | null = null;

async function varrerPasta(pasta: string): Promise<Varredura[]> {
  const relativos: string[] = [];
  await varrer(pasta, pasta, 0, relativos);
  relativos.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

  return Promise.all(
    relativos.map(async (relativo) => {
      const absoluto = path.join(pasta, relativo);
      const lido = lerNome(relativo);
      // Episódio costuma morar numa pasta com o nome da série; quando o
      // arquivo se chama só "S01E03", o nome vem da pasta.
      if (lido.temporada !== null && lido.nome.length < 2) {
        lido.nome = lerNome(path.basename(path.dirname(absoluto))).nome;
      }
      const [info, legenda] = await Promise.all([fs.stat(absoluto), legendaDe(absoluto)]);
      return {
        id: codificar(relativo),
        relativo,
        ...lido,
        tamanhoBytes: info.size,
        temLegenda: legenda !== null,
        idioma: idiomaPeloNome(relativo.replace(/[._]+/g, ' '), legenda !== null),
      };
    }),
  );
}

const tipoDe = (item: Pick<Varredura, 'temporada'>) => (item.temporada !== null ? 'serie' : 'filme');

let reconhecendo: Promise<number> | null = null;

/**
 * Reconhece no TMDB os arquivos que o banco ainda não conhece, quatro por
 * vez. Nunca é esperado pela tela: roda por trás, e o arquivo aparece com
 * capa no próximo carregamento. Devolve quantos reconheceu.
 */
export function reconhecerPendentes(itens: Varredura[]): Promise<number> {
  if (reconhecendo) return reconhecendo;
  const nomes = new Map<string, Varredura>();
  for (const item of itens) {
    if (acervo.identificacaoGuardada(item.nome, tipoDe(item), item.ano) === undefined) {
      nomes.set(`${tipoDe(item)}|${item.nome}|${item.ano}`, item);
    }
  }
  const fila = [...nomes.values()];
  if (fila.length === 0) return Promise.resolve(0);

  reconhecendo = (async () => {
    let feitos = 0;
    const operario = async () => {
      for (let item = fila.shift(); item; item = fila.shift()) {
        await acervo.identificar(item.nome, tipoDe(item), item.ano);
        feitos++;
      }
    };
    await Promise.all([operario(), operario(), operario(), operario()]);
    return feitos;
  })().finally(() => (reconhecendo = null));
  return reconhecendo;
}

/**
 * Lista os vídeos da pasta com o reconhecimento que já está no banco. Não
 * espera o TMDB: o que falta reconhecer vai para a fila de fundo.
 */
export async function listarBiblioteca(): Promise<ArquivoDeVideo[]> {
  const pasta = pastaDaBiblioteca();
  if (!pasta) return [];

  if (!ultimaVarredura || ultimaVarredura.pasta !== pasta || Date.now() - ultimaVarredura.em > VALIDADE_DA_VARREDURA) {
    ultimaVarredura = { em: Date.now(), pasta, itens: varrerPasta(pasta) };
    ultimaVarredura.itens.catch(() => (ultimaVarredura = null));
  }
  const itens = await ultimaVarredura.itens;

  reconhecerPendentes(itens).catch(() => undefined);
  return itens.map((item) => ({
    ...item,
    tmdb: acervo.identificacaoGuardada(item.nome, tipoDe(item), item.ano) ?? null,
  }));
}

/** Converte legenda .srt em WebVTT, que é o único formato que o <track> aceita. */
export function srtParaVtt(srt: string): string {
  const corpo = srt
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${corpo}`;
}
