/**
 * Onde abrir cada serviço de streaming, já na busca pelo título.
 *
 * O endereço é o do site oficial. No celular e na TV com Android, o próprio
 * sistema abre o aplicativo do serviço quando ele está instalado, porque
 * esses serviços registram o domínio deles no aparelho.
 */

const BUSCA: { nome: RegExp; url: (titulo: string) => string }[] = [
  { nome: /^netflix/i, url: (t) => `https://www.netflix.com/search?q=${t}` },
  { nome: /prime video|amazon video/i, url: (t) => `https://www.primevideo.com/search/ref=atv_nb_sug?phrase=${t}` },
  { nome: /globoplay/i, url: (t) => `https://globoplay.globo.com/busca/?q=${t}` },
  { nome: /disney/i, url: (t) => `https://www.disneyplus.com/pt-br/search?q=${t}` },
  { nome: /hbo max|^max/i, url: (t) => `https://play.hbomax.com/search?q=${t}` },
  { nome: /apple tv/i, url: (t) => `https://tv.apple.com/br/search?term=${t}` },
  { nome: /paramount/i, url: (t) => `https://www.paramountplus.com/br/search/?q=${t}` },
  { nome: /google play/i, url: (t) => `https://play.google.com/store/search?q=${t}&c=movies` },
  { nome: /claro/i, url: (t) => `https://www.clarotvmais.com.br/busca?q=${t}` },
  { nome: /crunchyroll/i, url: (t) => `https://www.crunchyroll.com/pt-br/search?q=${t}` },
  { nome: /looke/i, url: (t) => `https://www.looke.com.br/busca?q=${t}` },
  { nome: /mubi/i, url: (t) => `https://mubi.com/pt/br/search/films?query=${t}` },
];

export function linkDoServico(servico: string, titulo: string): string | null {
  const achado = BUSCA.find((b) => b.nome.test(servico));
  return achado ? achado.url(encodeURIComponent(titulo)) : null;
}
