import { useSyncExternalStore } from 'react';

function semAssinatura() {
  return () => {};
}

function aoMudarArmazenamento(avisar: () => void) {
  window.addEventListener('storage', avisar);
  return () => window.removeEventListener('storage', avisar);
}

/**
 * Lê um valor que só existe no navegador: localStorage, a ponte do app de
 * Android, a origem da página.
 *
 * Ler isso num useEffect e jogar no estado faz a tela renderizar duas vezes e
 * o React 19 acusa. Aqui o servidor desenha com `noServidor` e o navegador lê
 * o valor real na hidratação, sem divergir.
 *
 * `ler` tem que devolver valor primitivo ou o mesmo objeto enquanto nada
 * mudar: objeto novo a cada chamada faz o React renderizar sem parar.
 */
export function useNoNavegador<T>(ler: () => T, noServidor: T, ouvirArmazenamento = false): T {
  return useSyncExternalStore(ouvirArmazenamento ? aoMudarArmazenamento : semAssinatura, ler, () => noServidor);
}
