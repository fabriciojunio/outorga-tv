/**
 * Todas as prateleiras do modo de casa, num lugar só.
 *
 * Para criar, tirar ou mudar de ordem uma fileira, é só mexer aqui. Cada
 * prateleira diz de onde vem (um endereço de listagem do TMDB), com quais
 * filtros, e em qual página aparece. O resto do sistema (banco, sincronizador,
 * telas) se ajusta sozinho.
 *
 * Códigos úteis, conferidos no TMDB para o Brasil:
 *   serviços: Netflix 8, Prime Video 119, Disney+ 337, Max 1899,
 *             Globoplay 307, Apple TV 350, Paramount+ 531, Crunchyroll 283
 *   gêneros de filme: Ação 28, Aventura 12, Animação 16, Comédia 35,
 *             Crime 80, Documentário 99, Drama 18, Família 10751,
 *             Terror 27, Romance 10749, Ficção científica 878, Suspense 53
 *   gêneros de série: Animação 16, Infantil 10762, Novela 10766,
 *             Comédia 35, Crime 80, Documentário 99, Reality 10764
 *   classificação no Brasil: L, 10, 12, 14, 16, 18
 */

import type { Tipo } from '../tmdb';

export type Pagina = 'inicio' | 'filmes' | 'series' | 'infantil';

export type Prateleira = {
  nome: string;
  paginas: Pagina[];
  caminho: string;
  tipo?: Tipo;
  filtros?: Record<string, string>;
};

const BR = { watch_region: 'BR' };
const noServico = (id: number) => ({ ...BR, with_watch_providers: String(id), sort_by: 'popularity.desc' });

export const PRATELEIRAS = {
  // ---------- Início ----------
  emAlta: { nome: 'Em alta na semana', paginas: ['inicio'], caminho: '/trending/all/week' },
  novelasBrasileiras: {
    nome: 'Novelas brasileiras',
    paginas: ['inicio', 'series'],
    caminho: '/discover/tv',
    tipo: 'serie',
    filtros: { with_genres: '10766', with_origin_country: 'BR', sort_by: 'popularity.desc' },
  },
  filmesPopulares: {
    nome: 'Filmes populares',
    paginas: ['inicio', 'filmes'],
    caminho: '/movie/popular',
    tipo: 'filme',
    filtros: { region: 'BR' },
  },
  seriesPopulares: {
    nome: 'Séries populares',
    paginas: ['inicio', 'series'],
    caminho: '/tv/popular',
    tipo: 'serie',
  },
  deGraca: {
    nome: 'De graça para assistir',
    paginas: ['inicio', 'filmes'],
    caminho: '/discover/movie',
    tipo: 'filme',
    filtros: { ...BR, with_watch_monetization_types: 'free|ads', sort_by: 'popularity.desc' },
  },
  nosCinemas: {
    nome: 'Nos cinemas',
    paginas: ['inicio', 'filmes'],
    caminho: '/movie/now_playing',
    tipo: 'filme',
    filtros: { region: 'BR' },
  },

  // ---------- Filmes, por serviço ----------
  filmesNetflix: { nome: 'Filmes na Netflix', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: noServico(8) },
  filmesPrime: { nome: 'Filmes no Prime Video', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: noServico(119) },
  filmesGloboplay: { nome: 'Filmes no Globoplay', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: noServico(307) },
  filmesDisney: { nome: 'Filmes no Disney+', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: noServico(337) },
  filmesMax: { nome: 'Filmes na Max', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: noServico(1899) },

  // ---------- Filmes, por assunto ----------
  filmesNacionais: {
    nome: 'Filmes nacionais',
    paginas: ['filmes'],
    caminho: '/discover/movie',
    tipo: 'filme',
    filtros: { with_origin_country: 'BR', sort_by: 'popularity.desc' },
  },
  filmesComedia: { nome: 'Comédia', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: { with_genres: '35', sort_by: 'popularity.desc' } },
  filmesAcao: { nome: 'Ação', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: { with_genres: '28', sort_by: 'popularity.desc' } },
  filmesRomance: { nome: 'Romance', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: { with_genres: '10749', sort_by: 'popularity.desc' } },
  filmesTerror: { nome: 'Terror', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: { with_genres: '27', sort_by: 'popularity.desc' } },
  filmesDocumentario: { nome: 'Documentários', paginas: ['filmes'], caminho: '/discover/movie', tipo: 'filme', filtros: { with_genres: '99', sort_by: 'popularity.desc' } },
  filmesClassicos: {
    nome: 'Os mais bem avaliados',
    paginas: ['filmes'],
    caminho: '/movie/top_rated',
    tipo: 'filme',
    filtros: { region: 'BR' },
  },

  // ---------- Séries, por serviço ----------
  seriesNetflix: { nome: 'Séries na Netflix', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: noServico(8) },
  seriesGloboplay: { nome: 'Séries e novelas no Globoplay', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: noServico(307) },
  seriesPrime: { nome: 'Séries no Prime Video', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: noServico(119) },
  seriesDisney: { nome: 'Séries no Disney+', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: noServico(337) },
  seriesMax: { nome: 'Séries na Max', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: noServico(1899) },

  // ---------- Séries, por assunto ----------
  seriesBrasileiras: {
    nome: 'Séries brasileiras',
    paginas: ['series'],
    caminho: '/discover/tv',
    tipo: 'serie',
    filtros: { with_origin_country: 'BR', without_genres: '10766', sort_by: 'popularity.desc' },
  },
  seriesComedia: { nome: 'Comédia', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: { with_genres: '35', sort_by: 'popularity.desc' } },
  seriesCrime: { nome: 'Crime e investigação', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: { with_genres: '80', sort_by: 'popularity.desc' } },
  seriesReality: { nome: 'Reality shows', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: { with_genres: '10764', sort_by: 'popularity.desc' } },
  seriesDocumentario: { nome: 'Documentários', paginas: ['series'], caminho: '/discover/tv', tipo: 'serie', filtros: { with_genres: '99', sort_by: 'popularity.desc' } },

  // ---------- Infantil ----------
  // Filme infantil é livre ou até 10 anos, e de animação ou família. Assim um
  // desenho adulto de animação não entra por engano.
  infantilFilmes: {
    nome: 'Filmes para crianças',
    paginas: ['infantil'],
    caminho: '/discover/movie',
    tipo: 'filme',
    filtros: { certification_country: 'BR', certification: 'L|10', with_genres: '16|10751', sort_by: 'popularity.desc' },
  },
  infantilDesenhos: {
    nome: 'Desenhos',
    paginas: ['infantil'],
    caminho: '/discover/tv',
    tipo: 'serie',
    filtros: { with_genres: '10762', sort_by: 'popularity.desc' },
  },
  infantilNetflix: {
    nome: 'Infantil na Netflix',
    paginas: ['infantil'],
    caminho: '/discover/movie',
    tipo: 'filme',
    filtros: { ...noServico(8), certification_country: 'BR', certification: 'L', with_genres: '16|10751' },
  },
  infantilDisney: {
    nome: 'Infantil no Disney+',
    paginas: ['infantil'],
    caminho: '/discover/movie',
    tipo: 'filme',
    filtros: { ...noServico(337), certification_country: 'BR', certification: 'L|10', with_genres: '16|10751' },
  },
  infantilNacional: {
    nome: 'Infantil brasileiro',
    paginas: ['infantil'],
    caminho: '/discover/tv',
    tipo: 'serie',
    filtros: { with_genres: '10762', with_origin_country: 'BR', sort_by: 'popularity.desc' },
  },
} satisfies Record<string, Prateleira>;

export type NomeDaPrateleira = keyof typeof PRATELEIRAS;

export function prateleirasDa(pagina: Pagina): NomeDaPrateleira[] {
  return (Object.keys(PRATELEIRAS) as NomeDaPrateleira[]).filter((nome) =>
    (PRATELEIRAS[nome].paginas as readonly Pagina[]).includes(pagina),
  );
}
