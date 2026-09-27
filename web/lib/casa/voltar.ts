/**
 * O botão de voltar, num lugar só.
 *
 * Quem abre algo por cima da página (o trailer, por exemplo) registra aqui
 * como se fecha. O voltar fecha primeiro o que está por cima, depois sai da
 * tela cheia, e só então volta de página.
 *
 * O app de Android chama window.outorgaVoltar() quando o botão de voltar do
 * aparelho é apertado: se a resposta for "nada", ele volta a página ou fecha
 * o app. Assim o mesmo comportamento vale no navegador, no celular e na TV.
 */

const pilha: (() => void)[] = [];

export function registrarFechamento(fechar: () => void): () => void {
  pilha.push(fechar);
  return () => {
    const i = pilha.lastIndexOf(fechar);
    if (i >= 0) pilha.splice(i, 1);
  };
}

/** Fecha o que estiver por cima. Devolve "fechou" ou "nada". */
export function fecharOQueEstaPorCima(): 'fechou' | 'nada' {
  const fechar = pilha.pop();
  if (fechar) {
    fechar();
    return 'fechou';
  }
  if (typeof document !== 'undefined' && document.fullscreenElement) {
    void document.exitFullscreen();
    return 'fechou';
  }
  return 'nada';
}

declare global {
  interface Window {
    outorgaVoltar?: () => 'fechou' | 'nada';
  }
}

if (typeof window !== 'undefined') window.outorgaVoltar = fecharOQueEstaPorCima;
