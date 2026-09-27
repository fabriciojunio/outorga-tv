import type { ArquivoDeVideo } from '@/lib/biblioteca';
import { paraItem, type ItemDaFileira } from './Fileira';

/**
 * Um cartaz por título: os episódios de uma série viram um cartaz só, que
 * leva para a página da série com a lista de episódios. Arquivo que o TMDB
 * não reconheceu vira cartaz com o nome, e toca direto.
 */
export function itensDaBiblioteca(arquivos: ArquivoDeVideo[], detalhe = 'No seu PC'): ItemDaFileira[] {
  const itens = new Map<string, ItemDaFileira>();
  for (const arquivo of arquivos) {
    if (arquivo.tmdb) {
      const chave = `${arquivo.tmdb.tipo}:${arquivo.tmdb.id}`;
      if (!itens.has(chave)) itens.set(chave, { ...paraItem(arquivo.tmdb), detalhe });
    } else {
      itens.set(arquivo.id, {
        chave: arquivo.id,
        href: `/casa/tocar/${arquivo.id}`,
        nome: arquivo.nome,
        detalhe: arquivo.temporada !== null ? `T${arquivo.temporada} · E${arquivo.episodio}` : detalhe,
        capa: null,
      });
    }
  }
  return [...itens.values()];
}
