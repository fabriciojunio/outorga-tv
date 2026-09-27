/**
 * Canais da página "Ao vivo", num lugar só. Para pôr ou tirar um canal, é
 * mexer nesta lista.
 *
 * Dois tipos, e a diferença é de direito, não de tecnologia:
 *
 * - NO_APP: canais que transmitem ao vivo oficialmente no YouTube e permitem
 *   tocar embutido. Tocam dentro do Outorga TV. O identificador é o do canal
 *   (começa com UC), conferido na página do próprio canal.
 *
 * - OFICIAIS: emissoras que só transmitem no site ou app delas (Globo, SBT,
 *   Record). O botão abre o site oficial; no celular e na TV com Android, o
 *   próprio sistema oferece abrir no app da emissora, se estiver instalado.
 */

export type CanalNoApp = { nome: string; canal: string; assunto: string };
export type CanalOficial = { nome: string; texto: string; url: string };

export const NO_APP: CanalNoApp[] = [
  { nome: 'CazéTV', canal: 'UCZiYbVptd3PVPf4f6eR6UaQ', assunto: 'Esportes' },
  { nome: 'CNN Brasil', canal: 'UCvdwhh_fDyWccR42-rReZLw', assunto: 'Notícias' },
  { nome: 'Record News', canal: 'UCuiLR4p6wQ3xLEm15pEn1Xw', assunto: 'Notícias' },
  { nome: 'SBT News', canal: 'UC376n347Ob5Lwzq2WGzF1AA', assunto: 'Notícias' },
  { nome: 'Jovem Pan News', canal: 'UCP391YRAjSOdM_bwievgaZA', assunto: 'Notícias' },
  { nome: 'Band Jornalismo', canal: 'UCoa-D_VfMkFrCYodrOC9-mA', assunto: 'Notícias' },
  { nome: 'GloboNews', canal: 'UCp6RRaz93Pt2xYZoEye_rLA', assunto: 'Notícias' },
  { nome: 'TV Cultura', canal: 'UCjOJvvYe6tyEHY21OD33h8A', assunto: 'Variedades' },
  { nome: 'TV Brasil', canal: 'UCSv9d0kQegylHWpP83jWSQg', assunto: 'Variedades' },
];

export const OFICIAIS: CanalOficial[] = [
  { nome: 'TV Globo', texto: 'Novelas, jornal e futebol. Grátis com conta Globo.', url: 'https://globoplay.globo.com/agora-na-tv/' },
  { nome: 'Globoplay', texto: 'Novelas inteiras, antigas e novas.', url: 'https://globoplay.globo.com/' },
  { nome: 'SBT', texto: 'Programação ao vivo, de graça.', url: 'https://www.sbt.com.br/ao-vivo' },
  { nome: 'Record', texto: 'Novelas e programas no Record Plus.', url: 'https://www.recordplus.com/' },
  { nome: 'Band', texto: 'Programação ao vivo.', url: 'https://www.band.uol.com.br/ao-vivo' },
  { nome: 'RedeTV!', texto: 'Programação ao vivo.', url: 'https://www.redetv.uol.com.br/aovivo' },
  { nome: 'TV Cultura', texto: 'Site oficial ao vivo.', url: 'https://cultura.uol.com.br/aovivo/' },
];
