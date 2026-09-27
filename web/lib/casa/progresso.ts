/**
 * Onde cada vídeo parou, guardado no próprio aparelho.
 *
 * Fica no armazenamento local de propósito: é conveniência de quem está
 * assistindo, a TV da sala e o celular têm cada um o seu. Toda leitura e
 * escrita é protegida, porque em janela anônima ou navegador de TV antigo o
 * armazenamento pode simplesmente não existir.
 */

const CHAVE = 'outorga.casa.progresso';
const MAXIMO = 30;

export type Progresso = {
  id: string;
  nome: string;
  capa: string | null;
  posicao: number;
  duracao: number;
  em: number;
};

function ler(): Record<string, Progresso> {
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) ?? '{}') as Record<string, Progresso>;
  } catch {
    return {};
  }
}

function gravar(todos: Record<string, Progresso>) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(todos));
  } catch {
    // sem armazenamento, sem "continuar assistindo"; o vídeo toca igual
  }
}

export function progressoDe(id: string): Progresso | null {
  return ler()[id] ?? null;
}

export function guardarProgresso(p: Progresso) {
  const todos = ler();
  // Perto do fim conta como visto e sai da lista.
  if (p.duracao > 0 && p.posicao / p.duracao > 0.95) {
    delete todos[p.id];
  } else if (p.posicao > 10) {
    todos[p.id] = p;
  }
  const ordenados = Object.values(todos).sort((a, b) => b.em - a.em).slice(0, MAXIMO);
  gravar(Object.fromEntries(ordenados.map((item) => [item.id, item])));
}

export function emAndamento(): Progresso[] {
  return Object.values(ler()).sort((a, b) => b.em - a.em);
}
