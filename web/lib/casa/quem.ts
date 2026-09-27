import { cookies } from 'next/headers';
import { COOKIE_DA_SESSAO, lerSessao, type Sessao } from './sessao';

/** Quem está usando, lido do cookie. O proxy já barrou quem não entrou. */
export async function quemEsta(): Promise<Sessao | null> {
  return lerSessao((await cookies()).get(COOKIE_DA_SESSAO)?.value);
}

export function primeiroNome(nome: string): string {
  return nome.split(/\s+/)[0] ?? nome;
}
