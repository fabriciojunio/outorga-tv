import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cartaz, Detalhe } from '@/lib/tmdb';

// O TMDB é trocado por um dublê que conta as chamadas. O que se prova aqui é
// a regra do acervo, não a rede.
const chamadas = { listar: 0, detalhe: 0, busca: 0, identificar: 0 };
let falhar = false;
let versao = 1;

const cartaz = (id: number, nome = `Título ${id}`): Cartaz => ({ id, tipo: 'filme', nome, ano: 2020, capa: 'c', fundo: 'f', nota: 7 });
const detalhe = (id: number): Detalhe => ({
  ...cartaz(id, `Título ${id} v${versao}`),
  nomeOriginal: 'Original',
  sinopse: 's',
  generos: [],
  duracaoMinutos: 100,
  temporadas: null,
  classificacao: 'L',
  elenco: [],
  trailer: null,
  ondeAssistir: { link: null, assinatura: [], aluguel: [], compra: [] },
  parecidos: [],
});

vi.mock('@/lib/tmdb', () => ({
  tmdbConfigurado: () => true,
  tmdb: {
    listar: vi.fn(async () => {
      chamadas.listar++;
      if (falhar) throw new Error('fora do ar');
      return [cartaz(1), cartaz(2)];
    }),
    detalhe: vi.fn(async (_tipo: string, id: number) => {
      chamadas.detalhe++;
      if (falhar) throw new Error('fora do ar');
      return detalhe(id);
    }),
    busca: vi.fn(async () => {
      chamadas.busca++;
      return [cartaz(50, 'Avenida Brasil')];
    }),
    identificar: vi.fn(async (nome: string) => {
      chamadas.identificar++;
      return nome === 'desconhecido' ? null : cartaz(77, nome);
    }),
    mudancas: vi.fn(async () => []),
  },
}));

const { acervo, VALIDADE } = await import('@/lib/casa/acervo');
const { banco } = await import('@/lib/casa/banco');

const esperarPorTras = () => new Promise((r) => setTimeout(r, 10));

beforeEach(() => {
  falhar = false;
  versao = 1;
  for (const k of Object.keys(chamadas) as (keyof typeof chamadas)[]) chamadas[k] = 0;
});

describe('acervo: responde do banco e só vai ao TMDB quando falta', () => {
  it('primeira leitura busca; a segunda sai do banco', async () => {
    await acervo.titulo('filme', 101);
    await acervo.titulo('filme', 101);
    expect(chamadas.detalhe).toBe(1);
  });

  it('pedidos iguais ao mesmo tempo viram uma chamada só', async () => {
    await Promise.all([acervo.titulo('filme', 102), acervo.titulo('filme', 102), acervo.titulo('filme', 102)]);
    expect(chamadas.detalhe).toBe(1);
  });

  it('registro velho responde na hora com o que tem e atualiza por trás', async () => {
    await acervo.titulo('filme', 103);
    banco().marcarVelhos('filme', [103]);
    versao = 2;
    const resposta = await acervo.titulo('filme', 103);
    expect(resposta.nome).toBe('Título 103 v1');
    await esperarPorTras();
    expect((await acervo.titulo('filme', 103)).nome).toBe('Título 103 v2');
  });

  it('com o TMDB fora do ar, quem está no banco continua sendo servido', async () => {
    await acervo.titulo('filme', 104);
    banco().marcarVelhos('filme', [104]);
    falhar = true;
    expect((await acervo.titulo('filme', 104)).id).toBe(104);
    await esperarPorTras();
    expect((await acervo.titulo('filme', 104)).id).toBe(104);
  });

  it('com o TMDB fora do ar e nada no banco, avisa com erro (e não grava vazio)', async () => {
    falhar = true;
    await expect(acervo.titulo('filme', 105)).rejects.toThrow();
    expect(acervo.temTitulo('filme', 105)).toBe(false);
  });

  it('lista vencida responde a guardada e renova por trás', async () => {
    await acervo.lista('emAlta');
    expect(chamadas.listar).toBe(1);
    await acervo.lista('emAlta');
    expect(chamadas.listar).toBe(1);
    expect(acervo.listaEstaVelha('emAlta')).toBe(false);
    expect(VALIDADE.lista).toBeGreaterThan(60_000);
  });
});

describe('busca', () => {
  it('menos de duas letras não gasta chamada', async () => {
    expect(await acervo.busca('a')).toEqual([]);
    expect(chamadas.busca).toBe(0);
  });

  it('acha o que já está guardado mesmo sem acento e junta com o TMDB', async () => {
    await acervo.titulo('filme', 106);
    const achados = await acervo.busca('titulo 106');
    expect(achados[0]?.id).toBe(106);
    expect(achados.some((c) => c.nome === 'Avenida Brasil')).toBe(true);
  });

  it('o mesmo termo não vai duas vezes ao TMDB', async () => {
    await acervo.busca('novela');
    await acervo.busca('Novela');
    expect(chamadas.busca).toBe(1);
  });
});

describe('reconhecimento de arquivo', () => {
  it('antes de reconhecer, o guardado é undefined; depois, o cartaz', async () => {
    expect(acervo.identificacaoGuardada('Sintel', 'filme', 2010)).toBeUndefined();
    await acervo.identificar('Sintel', 'filme', 2010);
    expect(acervo.identificacaoGuardada('Sintel', 'filme', 2010)?.id).toBe(77);
    await acervo.identificar('Sintel', 'filme', 2010);
    expect(chamadas.identificar).toBe(1);
  });

  it('nome que o TMDB não conhece fica guardado como null, e não é perguntado de novo em seguida', async () => {
    expect(await acervo.identificar('desconhecido', 'filme', null)).toBeNull();
    expect(acervo.identificacaoGuardada('desconhecido', 'filme', null)).toBeNull();
    await acervo.identificar('desconhecido', 'filme', null);
    expect(chamadas.identificar).toBe(1);
  });
});
