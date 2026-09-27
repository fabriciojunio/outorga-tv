/**
 * Acervo de casa: o catálogo do TMDB guardado no banco próprio.
 *
 * A regra é uma só, e vale para lista, título, busca e reconhecimento de
 * arquivo: se está no banco, responde do banco na hora. Se está velho,
 * responde do banco do mesmo jeito e atualiza por trás, sem a tela esperar.
 * O TMDB só é chamado com a tela esperando quando o registro não existe
 * ainda, e o sincronizador (lib/casa/sincronizacao) trabalha para que isso
 * quase nunca aconteça, puxando antes os títulos que vão ser abertos.
 *
 * Se o TMDB cair ou demorar, quem já está no banco continua sendo servido.
 */

import { banco, normalizar } from './banco';
import { PRATELEIRAS, type NomeDaPrateleira, type Prateleira } from './prateleiras';
import { tmdb, type Cartaz, type Detalhe, type Tipo } from '../tmdb';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export const VALIDADE = {
  lista: 3 * HORA,
  titulo: 7 * DIA,
  busca: DIA,
  reconhecimento: 30 * DIA,
  reconhecimentoSemResultado: DIA,
};

export type NomeDaLista = NomeDaPrateleira;

function buscarPrateleira(nome: NomeDaLista): Promise<Cartaz[]> {
  const p: Prateleira = PRATELEIRAS[nome];
  return tmdb.listar(p.caminho, p.filtros ?? {}, p.tipo);
}

// A mesma busca pedida duas vezes ao mesmo tempo (duas TVs abrindo a mesma
// página, ou a página e o sincronizador) vira uma chamada só ao TMDB.
const emAndamento = new Map<string, Promise<unknown>>();

function umaVez<T>(chave: string, trabalho: () => Promise<T>): Promise<T> {
  const existente = emAndamento.get(chave) as Promise<T> | undefined;
  if (existente) return existente;
  const promessa = trabalho().finally(() => emAndamento.delete(chave));
  emAndamento.set(chave, promessa);
  return promessa;
}

function porTras(trabalho: Promise<unknown>) {
  // Falha na atualização de fundo não derruba nada: o dado antigo continua
  // no banco e o próximo ciclo tenta de novo.
  trabalho.catch(() => undefined);
}

async function comCache<T>(
  espaco: string,
  chave: string,
  validade: number,
  buscarNoTmdb: () => Promise<T>,
): Promise<T> {
  const atualizar = () =>
    umaVez(`${espaco}:${chave}`, async () => {
      const dados = await buscarNoTmdb();
      banco().gravarCache(espaco, chave, dados);
      return dados;
    });

  const guardado = banco().lerCache<T>(espaco, chave);
  if (guardado) {
    if (Date.now() - guardado.atualizadoEm > validade) porTras(atualizar());
    return guardado.dados;
  }
  return atualizar();
}

function chaveDeReconhecimento(nome: string, tipo: Tipo, ano: number | null) {
  return `${tipo}|${normalizar(nome)}|${ano ?? ''}`;
}

export const acervo = {
  lista: (nome: NomeDaLista): Promise<Cartaz[]> =>
    comCache('lista', nome, VALIDADE.lista, () => buscarPrateleira(nome)),

  /** Força a lista a vir do TMDB agora. Usado pelo sincronizador. */
  atualizarLista: (nome: NomeDaLista): Promise<Cartaz[]> =>
    umaVez(`lista:${nome}`, async () => {
      const itens = await buscarPrateleira(nome);
      banco().gravarCache('lista', nome, itens);
      return itens;
    }),

  listaEstaVelha: (nome: NomeDaLista): boolean => {
    const guardado = banco().lerCache('lista', nome);
    return !guardado || Date.now() - guardado.atualizadoEm > VALIDADE.lista;
  },

  temTitulo: (tipo: Tipo, id: number): boolean => banco().lerTitulo(tipo, id) !== null,

  titulo: async (tipo: Tipo, id: number): Promise<Detalhe> => {
    const guardado = banco().lerTitulo(tipo, id);
    if (guardado) {
      if (guardado.velho || Date.now() - guardado.atualizadoEm > VALIDADE.titulo) {
        porTras(acervo.atualizarTitulo(tipo, id));
      }
      return guardado.dados;
    }
    return acervo.atualizarTitulo(tipo, id);
  },

  atualizarTitulo: (tipo: Tipo, id: number): Promise<Detalhe> =>
    umaVez(`titulo:${tipo}:${id}`, async () => {
      const detalhe = await tmdb.detalhe(tipo, id);
      banco().gravarTitulo(detalhe);
      return detalhe;
    }),

  /**
   * Busca olha primeiro o que já está guardado e junta com o resultado do
   * TMDB para o termo, que também fica guardado. O que já estava no banco vem
   * na frente, porque é o que abre sem espera.
   */
  busca: async (termo: string): Promise<Cartaz[]> => {
    const limpo = normalizar(termo);
    if (limpo.length < 2) return [];

    const locais = banco().procurarTitulos(limpo, 20);
    let remotos: Cartaz[] = [];
    try {
      remotos = await comCache('busca', limpo, VALIDADE.busca, () => tmdb.busca(termo));
    } catch {
      // Sem TMDB, a busca vive só do banco.
    }

    const vistos = new Set(locais.map((c) => `${c.tipo}:${c.id}`));
    return [...locais, ...remotos.filter((c) => !vistos.has(`${c.tipo}:${c.id}`))];
  },

  /**
   * O reconhecimento que já está no banco, sem ir ao TMDB. undefined quer
   * dizer que o arquivo nunca foi reconhecido (ou o resultado venceu).
   */
  identificacaoGuardada: (nome: string, tipo: Tipo, ano: number | null): Cartaz | null | undefined => {
    const guardado = banco().lerCache<{ cartaz: Cartaz | null }>('reconhecimento', chaveDeReconhecimento(nome, tipo, ano));
    if (!guardado) return undefined;
    const validade = guardado.dados.cartaz ? VALIDADE.reconhecimento : VALIDADE.reconhecimentoSemResultado;
    // Vencido com resultado ainda serve: o nome do arquivo não mudou.
    if (!guardado.dados.cartaz && Date.now() - guardado.atualizadoEm > validade) return undefined;
    return guardado.dados.cartaz;
  },

  /** Reconhece um arquivo da pasta pelo nome. Guardado por 30 dias. */
  identificar: async (nome: string, tipo: Tipo, ano: number | null): Promise<Cartaz | null> => {
    const chave = chaveDeReconhecimento(nome, tipo, ano);
    const guardado = banco().lerCache<{ cartaz: Cartaz | null }>('reconhecimento', chave);
    if (guardado) {
      const validade = guardado.dados.cartaz ? VALIDADE.reconhecimento : VALIDADE.reconhecimentoSemResultado;
      if (Date.now() - guardado.atualizadoEm <= validade) return guardado.dados.cartaz;
    }
    try {
      const cartaz = await umaVez(`reconhecimento:${chave}`, () => tmdb.identificar(nome, tipo, ano));
      banco().gravarCache('reconhecimento', chave, { cartaz });
      return cartaz;
    } catch {
      return guardado?.dados.cartaz ?? null;
    }
  },

  situacao: () => {
    const b = banco();
    const ultima = b.lerControle('ultima-sincronizacao');
    return {
      banco: b.tipo,
      ...b.contagem(),
      ultimaSincronizacao: ultima ? Number(ultima) : null,
    };
  },
};
