/**
 * Banco do acervo de casa.
 *
 * SQLite num arquivo do próprio PC (web/.dados/casa.db por padrão, ou o que
 * estiver em CASA_BANCO). A escolha foi pelo local e não pelo Neon porque o
 * sincronizador roda de tempos em tempos para manter tudo atualizado, e no
 * Neon isso deixaria o banco acordado queimando a cota de horas da conta, que
 * é dividida com os outros projetos. Local também não tem rede no caminho: a
 * leitura leva microssegundos, então a página nunca espera o banco.
 *
 * Se o arquivo não puder ser aberto (na Vercel o disco é só leitura, por
 * exemplo), cai para um banco em memória com a mesma interface. Perde o que
 * guardou ao reiniciar, mas nada quebra.
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Cartaz, Detalhe, Tipo } from '../tmdb';

export type Guardado<T> = { dados: T; atualizadoEm: number; velho: boolean };

export interface Banco {
  readonly tipo: 'sqlite' | 'memoria';
  lerTitulo(tipo: Tipo, id: number): Guardado<Detalhe> | null;
  gravarTitulo(detalhe: Detalhe): void;
  /** Marca como velhos os títulos guardados que mudaram no TMDB. Devolve quantos. */
  marcarVelhos(tipo: Tipo, ids: number[]): number;
  titulosParaAtualizar(antesDe: number, limite: number): { tipo: Tipo; id: number }[];
  procurarTitulos(termo: string, limite: number): Cartaz[];
  lerCache<T>(espaco: string, chave: string): Guardado<T> | null;
  gravarCache(espaco: string, chave: string, dados: unknown): void;
  lerControle(chave: string): string | null;
  gravarControle(chave: string, valor: string): void;
  contagem(): { titulos: number; caches: number };
}

/** Minúsculo e sem acento, para "acao" achar "Ação". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function paraCartaz(d: Detalhe): Cartaz {
  return { id: d.id, tipo: d.tipo, nome: d.nome, ano: d.ano, capa: d.capa, fundo: d.fundo, nota: d.nota };
}

function abrirSqlite(): Banco {
  // getBuiltinModule em vez de require/import: o empacotador do Next reescreve
  // os dois e não sabe resolver o node:sqlite ("Unsupported external type").
  // Pedido direto ao Node, o módulo vem sem passar pelo empacotador.
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');

  // O comentário impede o Turbopack de achar que precisa empacotar o projeto
  // inteiro por causa de um caminho que só se sabe em tempo de execução.
  const arquivo = path.resolve(
    /*turbopackIgnore: true*/ process.env.CASA_BANCO ?? path.join(process.cwd(), '.dados', 'casa.db'),
  );
  mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new DatabaseSync(arquivo);

  // WAL deixa a leitura da página correr em paralelo com a gravação do
  // sincronizador, e o busy_timeout evita erro se os dois se cruzarem.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 3000;

    CREATE TABLE IF NOT EXISTS titulo (
      tipo          TEXT    NOT NULL,
      id            INTEGER NOT NULL,
      nome_busca    TEXT    NOT NULL,
      popularidade  REAL    NOT NULL DEFAULT 0,
      dados         TEXT    NOT NULL,
      atualizado_em INTEGER NOT NULL,
      velho         INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tipo, id)
    );
    CREATE INDEX IF NOT EXISTS titulo_por_idade ON titulo (velho DESC, atualizado_em);

    CREATE TABLE IF NOT EXISTS cache (
      espaco        TEXT    NOT NULL,
      chave         TEXT    NOT NULL,
      dados         TEXT    NOT NULL,
      atualizado_em INTEGER NOT NULL,
      PRIMARY KEY (espaco, chave)
    );

    CREATE TABLE IF NOT EXISTS controle (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  const sql = {
    lerTitulo: db.prepare('SELECT dados, atualizado_em, velho FROM titulo WHERE tipo = ? AND id = ?'),
    gravarTitulo: db.prepare(`
      INSERT INTO titulo (tipo, id, nome_busca, popularidade, dados, atualizado_em, velho)
      VALUES (?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT (tipo, id) DO UPDATE SET
        nome_busca = excluded.nome_busca, popularidade = excluded.popularidade,
        dados = excluded.dados, atualizado_em = excluded.atualizado_em, velho = 0`),
    marcarVelhos: db.prepare(
      'UPDATE titulo SET velho = 1 WHERE tipo = ? AND id IN (SELECT value FROM json_each(?))',
    ),
    paraAtualizar: db.prepare(
      'SELECT tipo, id FROM titulo WHERE velho = 1 OR atualizado_em < ? ORDER BY velho DESC, atualizado_em LIMIT ?',
    ),
    procurar: db.prepare(
      'SELECT dados FROM titulo WHERE nome_busca LIKE ? ORDER BY popularidade DESC LIMIT ?',
    ),
    lerCache: db.prepare('SELECT dados, atualizado_em FROM cache WHERE espaco = ? AND chave = ?'),
    gravarCache: db.prepare(`
      INSERT INTO cache (espaco, chave, dados, atualizado_em) VALUES (?, ?, ?, ?)
      ON CONFLICT (espaco, chave) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em`),
    lerControle: db.prepare('SELECT valor FROM controle WHERE chave = ?'),
    gravarControle: db.prepare(
      'INSERT INTO controle (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor',
    ),
    contarTitulos: db.prepare('SELECT count(*) AS n FROM titulo'),
    contarCaches: db.prepare('SELECT count(*) AS n FROM cache'),
  };

  type Linha = { dados: string; atualizado_em: number; velho?: number };

  return {
    tipo: 'sqlite',
    lerTitulo(tipo, id) {
      const linha = sql.lerTitulo.get(tipo, id) as Linha | undefined;
      return linha
        ? { dados: JSON.parse(linha.dados) as Detalhe, atualizadoEm: linha.atualizado_em, velho: linha.velho === 1 }
        : null;
    },
    gravarTitulo(d) {
      const nomes = normalizar(`${d.nome} ${d.nomeOriginal}`);
      sql.gravarTitulo.run(d.tipo, d.id, nomes, d.nota ?? 0, JSON.stringify(d), Date.now());
    },
    marcarVelhos(tipo, ids) {
      let total = 0;
      for (let i = 0; i < ids.length; i += 500) {
        total += Number(sql.marcarVelhos.run(tipo, JSON.stringify(ids.slice(i, i + 500))).changes);
      }
      return total;
    },
    titulosParaAtualizar(antesDe, limite) {
      return sql.paraAtualizar.all(antesDe, limite) as { tipo: Tipo; id: number }[];
    },
    procurarTitulos(termo, limite) {
      const padrao = `%${normalizar(termo).replace(/[%_]/g, '')}%`;
      return (sql.procurar.all(padrao, limite) as Linha[]).map((l) => paraCartaz(JSON.parse(l.dados)));
    },
    lerCache<T>(espaco: string, chave: string) {
      const linha = sql.lerCache.get(espaco, chave) as Linha | undefined;
      return linha ? { dados: JSON.parse(linha.dados) as T, atualizadoEm: linha.atualizado_em, velho: false } : null;
    },
    gravarCache(espaco, chave, dados) {
      sql.gravarCache.run(espaco, chave, JSON.stringify(dados), Date.now());
    },
    lerControle(chave) {
      return (sql.lerControle.get(chave) as { valor: string } | undefined)?.valor ?? null;
    },
    gravarControle(chave, valor) {
      sql.gravarControle.run(chave, valor);
    },
    contagem() {
      return {
        titulos: Number((sql.contarTitulos.get() as { n: number }).n),
        caches: Number((sql.contarCaches.get() as { n: number }).n),
      };
    },
  };
}

function abrirMemoria(): Banco {
  const titulos = new Map<string, Guardado<Detalhe>>();
  const caches = new Map<string, Guardado<unknown>>();
  const controle = new Map<string, string>();

  return {
    tipo: 'memoria',
    lerTitulo: (tipo, id) => titulos.get(`${tipo}:${id}`) ?? null,
    gravarTitulo: (d) => titulos.set(`${d.tipo}:${d.id}`, { dados: d, atualizadoEm: Date.now(), velho: false }),
    marcarVelhos(tipo, ids) {
      let total = 0;
      for (const id of ids) {
        const g = titulos.get(`${tipo}:${id}`);
        if (g) {
          g.velho = true;
          total++;
        }
      }
      return total;
    },
    titulosParaAtualizar(antesDe, limite) {
      return [...titulos.values()]
        .filter((g) => g.velho || g.atualizadoEm < antesDe)
        .slice(0, limite)
        .map((g) => ({ tipo: g.dados.tipo, id: g.dados.id }));
    },
    procurarTitulos(termo, limite) {
      const alvo = normalizar(termo);
      return [...titulos.values()]
        .filter((g) => normalizar(`${g.dados.nome} ${g.dados.nomeOriginal}`).includes(alvo))
        .slice(0, limite)
        .map((g) => paraCartaz(g.dados));
    },
    lerCache: <T,>(espaco: string, chave: string) =>
      (caches.get(`${espaco}:${chave}`) as Guardado<T> | undefined) ?? null,
    gravarCache: (espaco, chave, dados) =>
      caches.set(`${espaco}:${chave}`, { dados, atualizadoEm: Date.now(), velho: false }),
    lerControle: (chave) => controle.get(chave) ?? null,
    gravarControle: (chave, valor) => controle.set(chave, valor),
    contagem: () => ({ titulos: titulos.size, caches: caches.size }),
  };
}

// Um banco só por processo, guardado no globalThis para sobreviver ao
// recarregamento do modo de desenvolvimento sem abrir o arquivo duas vezes.
const global = globalThis as unknown as { __bancoDaCasa?: Banco };

export function banco(): Banco {
  if (!global.__bancoDaCasa) {
    try {
      global.__bancoDaCasa = abrirSqlite();
    } catch (erro) {
      console.warn('[casa] SQLite indisponível, usando banco em memória:', (erro as Error).message);
      global.__bancoDaCasa = abrirMemoria();
    }
  }
  return global.__bancoDaCasa;
}
