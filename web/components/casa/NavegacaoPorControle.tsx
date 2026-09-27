'use client';

import { useEffect } from 'react';
import { fecharOQueEstaPorCima } from '@/lib/casa/voltar';

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, video, [tabindex]:not([tabindex="-1"])';

const DIRECOES: Record<string, 'cima' | 'baixo' | 'esquerda' | 'direita'> = {
  ArrowUp: 'cima',
  ArrowDown: 'baixo',
  ArrowLeft: 'esquerda',
  ArrowRight: 'direita',
};

// Voltar do controle: webOS (LG) manda 461, Tizen (Samsung) manda 10009,
// Android TV manda GoBack ou BrowserBack.
const CODIGOS_DE_VOLTAR = new Set([461, 10009]);

function ehCampoDeTexto(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !['button', 'submit', 'checkbox', 'radio'].includes(el.type);
}

function visivel(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false;
  return getComputedStyle(el).visibility !== 'hidden';
}

export type Caixa = { left: number; right: number; top: number; bottom: number; cx: number; cy: number };

function caixa(el: Element): Caixa {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

/**
 * Escolhe o próximo elemento na direção pedida. Primeiro tenta quem está
 * "na mesma linha" (sobreposto no eixo perpendicular), que é o que a pessoa
 * espera ao andar pelos cartazes de uma fileira. Se não houver, pega a faixa
 * mais próxima naquela direção e, dentro dela, o mais alinhado.
 */
function proximo(atual: Caixa, candidatos: HTMLElement[], direcao: string): HTMLElement | null {
  return escolherNaDirecao(
    atual,
    candidatos.map((el) => ({ item: el, caixa: caixa(el) })),
    direcao,
  );
}

/** A escolha em si, sem DOM, para dar para testar com caixas de mentira. */
export function escolherNaDirecao<T>(atual: Caixa, candidatos: { item: T; caixa: Caixa }[], direcao: string): T | null {
  const horizontal = direcao === 'esquerda' || direcao === 'direita';
  const medidos = candidatos
    .map(({ item: el, caixa: c }) => {
      let principal: number;
      if (direcao === 'direita') principal = c.left - atual.right;
      else if (direcao === 'esquerda') principal = atual.left - c.right;
      else if (direcao === 'baixo') principal = c.top - atual.bottom;
      else principal = atual.top - c.bottom;

      const avancou =
        direcao === 'direita' ? c.cx > atual.cx : direcao === 'esquerda' ? c.cx < atual.cx : direcao === 'baixo' ? c.cy > atual.cy : c.cy < atual.cy;

      const sobreposicao = horizontal
        ? Math.min(c.bottom, atual.bottom) - Math.max(c.top, atual.top)
        : Math.min(c.right, atual.right) - Math.max(c.left, atual.left);
      const cruzado = horizontal ? Math.abs(c.cy - atual.cy) : Math.abs(c.cx - atual.cx);

      return { el, principal: Math.max(0, principal), avancou: avancou && principal > -4, sobreposicao, cruzado };
    })
    .filter((m) => m.avancou);

  if (medidos.length === 0) return null;

  const naMesmaLinha = medidos.filter((m) => m.sobreposicao > 0);
  if (naMesmaLinha.length > 0) {
    naMesmaLinha.sort((a, b) => a.principal - b.principal || a.cruzado - b.cruzado);
    return naMesmaLinha[0]?.el ?? null;
  }

  const menor = Math.min(...medidos.map((m) => m.principal));
  const faixa = medidos.filter((m) => m.principal <= menor + 48);
  faixa.sort((a, b) => a.cruzado - b.cruzado);
  return faixa[0]?.el ?? null;
}

/**
 * Navegação pelas setas do controle remoto, para TV sem mouse. No PC e no
 * celular não atrapalha: o mouse e o toque continuam iguais, e as setas só
 * passam a andar entre os itens em vez de rolar a página.
 *
 * Quem quer usar as setas para outra coisa (o player, para avançar o vídeo)
 * chama preventDefault no próprio elemento, e aqui o evento é ignorado.
 */
export function NavegacaoPorControle() {
  useEffect(() => {
    function aoApertar(evento: KeyboardEvent) {
      if (evento.defaultPrevented || evento.altKey || evento.ctrlKey || evento.metaKey) return;
      const ativo = document.activeElement as HTMLElement | null;

      const voltar =
        evento.key === 'GoBack' ||
        evento.key === 'BrowserBack' ||
        CODIGOS_DE_VOLTAR.has(evento.keyCode) ||
        (evento.key === 'Backspace' && !ehCampoDeTexto(ativo));
      if (voltar) {
        evento.preventDefault();
        if (fecharOQueEstaPorCima() === 'nada') window.history.back();
        return;
      }

      const direcao = DIRECOES[evento.key];
      if (!direcao) return;
      // Dentro da caixa de busca, esquerda e direita andam pelo texto.
      if (ehCampoDeTexto(ativo) && (direcao === 'esquerda' || direcao === 'direita')) return;

      const candidatos = Array.from(document.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (el) => el !== ativo && visivel(el),
      );

      let alvo: HTMLElement | null;
      if (!ativo || ativo === document.body) {
        // Primeira seta: foca o primeiro item que está na tela.
        alvo = candidatos.find((el) => {
          const r = el.getBoundingClientRect();
          return r.top >= 0 && r.top < window.innerHeight;
        }) ?? null;
      } else {
        alvo = proximo(caixa(ativo), candidatos, direcao);
      }

      if (!alvo) return;
      evento.preventDefault();
      alvo.focus({ preventScroll: true });
      alvo.scrollIntoView({
        block: direcao === 'cima' || direcao === 'baixo' ? 'center' : 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
    }

    document.addEventListener('keydown', aoApertar);
    // Marca que o controle já responde; o teste de ponta a ponta espera por isto.
    document.documentElement.dataset.controle = 'pronto';
    return () => {
      document.removeEventListener('keydown', aoApertar);
      delete document.documentElement.dataset.controle;
    };
  }, []);

  return null;
}
