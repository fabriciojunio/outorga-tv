/**
 * Cliente do TMDB para o modo "Em casa".
 *
 * Só roda no servidor. O token fica em TMDB_TOKEN, sem o prefixo
 * NEXT_PUBLIC_, então o Next nunca o coloca no pacote do navegador. As
 * telas não chamam este arquivo direto: passam pelo acervo (lib/casa/acervo),
 * que guarda tudo no banco e só vem aqui quando falta ou quando envelheceu.
 *
 * O TMDB entrega capa, sinopse, elenco, trailer e onde o título está
 * disponível no Brasil. Vídeo do filme ele não entrega, e aqui ninguém
 * inventa fonte: o que toca é trailer do YouTube ou arquivo da sua pasta.
 */

const BASE = 'https://api.themoviedb.org/3';
const IMAGENS = 'https://image.tmdb.org/t/p';
const IDIOMA = 'pt-BR';
const REGIAO = 'BR';

export type Tipo = 'filme' | 'serie';

export type Cartaz = {
  id: number;
  tipo: Tipo;
  nome: string;
  ano: number | null;
  capa: string | null;
  fundo: string | null;
  nota: number | null;
};

export type Provedor = { nome: string; logo: string | null };

export type Detalhe = Cartaz & {
  nomeOriginal: string;
  sinopse: string | null;
  generos: string[];
  duracaoMinutos: number | null;
  temporadas: number | null;
  classificacao: string | null;
  elenco: { nome: string; personagem: string; foto: string | null }[];
  trailer: string | null;
  ondeAssistir: {
    link: string | null;
    assinatura: Provedor[];
    aluguel: Provedor[];
    compra: Provedor[];
  };
  parecidos: Cartaz[];
};

export function tmdbConfigurado(): boolean {
  return Boolean(process.env.TMDB_TOKEN);
}

export function imagem(caminho: string | null | undefined, tamanho: string): string | null {
  return caminho ? `${IMAGENS}/${tamanho}${caminho}` : null;
}

async function buscar<T>(caminho: string, parametros: Record<string, string> = {}): Promise<T> {
  const token = process.env.TMDB_TOKEN;
  if (!token) throw new Error('TMDB_TOKEN não configurado');

  const url = new URL(`${BASE}${caminho}`);
  url.searchParams.set('language', IDIOMA);
  for (const [chave, valor] of Object.entries(parametros)) url.searchParams.set(chave, valor);

  // Quem guarda é o banco do acervo, não o cache do Next. O limite de tempo
  // existe para que um TMDB lento nunca segure a página: o acervo responde com
  // o que já tem e tenta de novo depois.
  const resposta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!resposta.ok) throw new Error(`TMDB respondeu ${resposta.status} em ${caminho}`);
  return (await resposta.json()) as T;
}

// Formato cru do TMDB, só com o que é usado aqui.
type Cru = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  overview?: string;
};

type Pagina = { results: Cru[] };

function anoDe(data?: string): number | null {
  const ano = Number(data?.slice(0, 4));
  return Number.isFinite(ano) && ano > 0 ? ano : null;
}

function paraCartaz(cru: Cru, tipo: Tipo): Cartaz {
  return {
    id: cru.id,
    tipo,
    nome: cru.title ?? cru.name ?? 'Sem nome',
    ano: anoDe(cru.release_date ?? cru.first_air_date),
    capa: imagem(cru.poster_path, 'w342'),
    fundo: imagem(cru.backdrop_path, 'w1280'),
    // Nota com poucos votos é ruído, então nem aparece.
    nota: cru.vote_count && cru.vote_count >= 20 ? Math.round((cru.vote_average ?? 0) * 10) / 10 : null,
  };
}

function lista(pagina: Pagina, tipoFixo?: Tipo): Cartaz[] {
  return pagina.results
    .filter((cru) => tipoFixo || cru.media_type === 'movie' || cru.media_type === 'tv')
    .map((cru) => paraCartaz(cru, tipoFixo ?? (cru.media_type === 'tv' ? 'serie' : 'filme')));
}

const segmento = (tipo: Tipo) => (tipo === 'serie' ? 'tv' : 'movie');

export const tmdb = {
  /**
   * Lista qualquer endpoint de listagem do TMDB. Com tipo, é lista de um tipo
   * só (/discover/movie, /tv/popular); sem tipo, é lista mista (/trending/all).
   * Com duas páginas, porque 20 cartazes numa fileira acabam rápido na TV.
   */
  listar: async (caminho: string, parametros: Record<string, string>, tipo?: Tipo): Promise<Cartaz[]> => {
    const tentativas = await Promise.allSettled(
      ['1', '2'].map((page) => buscar<Pagina>(caminho, { ...parametros, page })),
    );
    const paginas = tentativas.flatMap((t) => (t.status === 'fulfilled' ? [t.value] : []));
    // Se nenhuma página veio, é falha e não lista vazia: lista vazia seria
    // gravada no banco e apagaria a prateleira por horas.
    if (paginas.length === 0) throw new Error(`TMDB não respondeu ${caminho}`);
    const vistos = new Set<string>();
    return paginas
      .flatMap((p) => lista(p, tipo))
      .filter((c) => {
        const chave = `${c.tipo}:${c.id}`;
        if (vistos.has(chave) || !c.capa) return false;
        vistos.add(chave);
        return true;
      });
  },

  busca: async (termo: string) =>
    lista(await buscar<Pagina>('/search/multi', { query: termo, include_adult: 'false' })),

  /** Usado para reconhecer o arquivo da sua pasta pelo nome. */
  identificar: async (nome: string, tipo: Tipo, ano: number | null): Promise<Cartaz | null> => {
    const parametros: Record<string, string> = { query: nome, include_adult: 'false' };
    if (ano) parametros[tipo === 'serie' ? 'first_air_date_year' : 'year'] = String(ano);
    const pagina = await buscar<Pagina>(`/search/${segmento(tipo)}`, parametros);
    const primeiro = pagina.results[0];
    return primeiro ? paraCartaz(primeiro, tipo) : null;
  },

  /**
   * Ids que mudaram no TMDB desde a data (no máximo 14 dias atrás, limite do
   * próprio TMDB). É o que permite atualizar só o que mudou, e não tudo.
   */
  mudancas: async (tipo: Tipo, desde: Date): Promise<number[]> => {
    const inicio = desde.toISOString().slice(0, 10);
    const ids: number[] = [];
    for (let pagina = 1; pagina <= 50; pagina++) {
      const resposta = await buscar<{ results: { id: number }[]; total_pages: number }>(
        `/${segmento(tipo)}/changes`,
        { start_date: inicio, page: String(pagina) },
      );
      ids.push(...resposta.results.map((r) => r.id));
      if (pagina >= resposta.total_pages) break;
    }
    return ids;
  },

  detalhe: async (tipo: Tipo, id: number): Promise<Detalhe> => {
    const extras =
      tipo === 'serie'
        ? 'videos,watch/providers,credits,content_ratings,recommendations'
        : 'videos,watch/providers,credits,release_dates,recommendations';
    const cru = await buscar<DetalheCru>(`/${segmento(tipo)}/${id}`, {
      append_to_response: extras,
      // Trailer dublado quase nunca existe; sem o inglês, a maioria ficaria sem.
      include_video_language: 'pt,en,null',
    });

    const provedores = cru['watch/providers']?.results?.[REGIAO];
    const paraProvedor = (p: { provider_name: string; logo_path: string | null }) => ({
      nome: p.provider_name,
      logo: imagem(p.logo_path, 'w92'),
    });

    return {
      ...paraCartaz(cru, tipo),
      fundo: imagem(cru.backdrop_path, 'original'),
      nomeOriginal: cru.original_title ?? cru.original_name ?? '',
      sinopse: cru.overview || null,
      generos: (cru.genres ?? []).map((g) => g.name),
      duracaoMinutos: cru.runtime ?? cru.episode_run_time?.[0] ?? null,
      temporadas: cru.number_of_seasons ?? null,
      classificacao: classificacaoNoBrasil(cru),
      elenco: (cru.credits?.cast ?? []).slice(0, 12).map((pessoa) => ({
        nome: pessoa.name,
        personagem: pessoa.character ?? '',
        foto: imagem(pessoa.profile_path, 'w185'),
      })),
      trailer: escolherTrailer(cru.videos?.results ?? []),
      ondeAssistir: {
        link: provedores?.link ?? null,
        assinatura: (provedores?.flatrate ?? []).map(paraProvedor),
        aluguel: (provedores?.rent ?? []).map(paraProvedor),
        compra: (provedores?.buy ?? []).map(paraProvedor),
      },
      parecidos: (cru.recommendations?.results ?? []).slice(0, 18).map((r) => paraCartaz(r, tipo)),
    };
  },
};

type Video = { site: string; type: string; key: string; iso_639_1: string | null; official?: boolean };

type DetalheCru = Cru & {
  genres?: { name: string }[];
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  credits?: { cast: { name: string; character?: string; profile_path: string | null }[] };
  videos?: { results: Video[] };
  recommendations?: Pagina;
  release_dates?: { results: { iso_3166_1: string; release_dates: { certification: string }[] }[] };
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
  'watch/providers'?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: { provider_name: string; logo_path: string | null }[];
        rent?: { provider_name: string; logo_path: string | null }[];
        buy?: { provider_name: string; logo_path: string | null }[];
      }
    >;
  };
};

/** Trailer em português antes do inglês, oficial antes do de fã, trailer antes de teaser. */
function escolherTrailer(videos: Video[]): string | null {
  const doYoutube = videos.filter((v) => v.site === 'YouTube');
  const peso = (v: Video) =>
    (v.type === 'Trailer' ? 0 : v.type === 'Teaser' ? 10 : 20) +
    (v.iso_639_1 === 'pt' ? 0 : 5) +
    (v.official ? 0 : 2);
  const melhor = [...doYoutube].sort((a, b) => peso(a) - peso(b))[0];
  return melhor ? melhor.key : null;
}

function classificacaoNoBrasil(cru: DetalheCru): string | null {
  const filme = cru.release_dates?.results
    .find((r) => r.iso_3166_1 === REGIAO)
    ?.release_dates.find((d) => d.certification)?.certification;
  const serie = cru.content_ratings?.results.find((r) => r.iso_3166_1 === REGIAO)?.rating;
  return filme || serie || null;
}
