import { describe, expect, it } from 'vitest';
import { escolherNaDirecao, type Caixa } from '@/components/casa/NavegacaoPorControle';
import { diaEmBrasilia, tituloFalaDoJogo, type Jogo } from '@/lib/casa/esportes';
import { PRATELEIRAS, prateleirasDa } from '@/lib/casa/prateleiras';
import { linkDoServico } from '@/lib/casa/servicos';
import { NO_APP, OFICIAIS } from '@/lib/casa/canais';

const caixa = (left: number, top: number, largura = 100, altura = 150): Caixa => ({
  left,
  top,
  right: left + largura,
  bottom: top + altura,
  cx: left + largura / 2,
  cy: top + altura / 2,
});

describe('navegação pelo controle remoto', () => {
  // Duas fileiras de cartazes, como na página inicial.
  const cartazes = [
    { item: 'a1', caixa: caixa(0, 0) },
    { item: 'a2', caixa: caixa(120, 0) },
    { item: 'a3', caixa: caixa(240, 0) },
    { item: 'b1', caixa: caixa(0, 200) },
    { item: 'b2', caixa: caixa(120, 200) },
    { item: 'b3', caixa: caixa(240, 200) },
  ];

  it('direita anda na mesma fileira', () => {
    expect(escolherNaDirecao(caixa(0, 0), cartazes.slice(1), 'direita')).toBe('a2');
  });

  it('baixo vai para a fileira de baixo, no cartaz alinhado', () => {
    const semA2 = cartazes.filter((c) => c.item !== 'a2');
    expect(escolherNaDirecao(caixa(120, 0), semA2, 'baixo')).toBe('b2');
  });

  it('não pula fileira: descer da primeira nunca cai na terceira', () => {
    const tres = [...cartazes, { item: 'c2', caixa: caixa(120, 400) }].filter((c) => c.item !== 'a2');
    expect(escolherNaDirecao(caixa(120, 0), tres, 'baixo')).toBe('b2');
  });

  it('no fim da fileira, direita não faz nada', () => {
    const semA3 = cartazes.filter((c) => c.item !== 'a3');
    expect(escolherNaDirecao(caixa(240, 0), semA3, 'direita')).toBeNull();
  });

  it('cima a partir da fileira de baixo volta para a de cima', () => {
    const semB1 = cartazes.filter((c) => c.item !== 'b1');
    expect(escolherNaDirecao(caixa(0, 200), semB1, 'cima')).toBe('a1');
  });
});

describe('esportes', () => {
  const jogo = (casa: string, fora: string) => ({ casa: { nome: casa }, fora: { nome: fora } }) as Jogo;

  it('reconhece o jogo pelo título da live, sem acento e sem caixa', () => {
    expect(tituloFalaDoJogo('AO VIVO: VÔLEI | SESI BAURU X LONDRINA', jogo('Sesi Bauru', 'Londrina'))).toBe(true);
    expect(tituloFalaDoJogo('AO VIVO: GRÊMIO X SÃO PAULO', jogo('Grêmio', 'São Paulo'))).toBe(true);
  });

  it('um time só no título não basta', () => {
    expect(tituloFalaDoJogo('AO VIVO: FLAMENGO X PALMEIRAS', jogo('Flamengo', 'Corinthians'))).toBe(false);
  });

  it('o dia é o de Brasília, não o do servidor', () => {
    // 01:30 de 28/09 em UTC ainda é 27/09 em Brasília.
    expect(diaEmBrasilia(0, new Date('2026-09-28T01:30:00Z'))).toBe('20260927');
    expect(diaEmBrasilia(1, new Date('2026-09-28T01:30:00Z'))).toBe('20260928');
  });
});

describe('serviços e configuração', () => {
  it('monta a busca do serviço com o título codificado', () => {
    expect(linkDoServico('Netflix', 'Avenida Brasil')).toBe('https://www.netflix.com/search?q=Avenida%20Brasil');
    expect(linkDoServico('Globoplay', 'Pé na Cova')).toContain('P%C3%A9%20na%20Cova');
    expect(linkDoServico('Serviço que não existe', 'x')).toBeNull();
  });

  it('toda página tem prateleira e toda prateleira tem página', () => {
    for (const pagina of ['inicio', 'filmes', 'series', 'infantil'] as const) {
      expect(prateleirasDa(pagina).length).toBeGreaterThan(0);
    }
    for (const p of Object.values(PRATELEIRAS)) expect(p.paginas.length).toBeGreaterThan(0);
  });

  it('infantil só pede classificação livre ou até 10 anos', () => {
    for (const nome of prateleirasDa('infantil')) {
      const filtros = (PRATELEIRAS[nome] as { filtros?: Record<string, string> }).filtros ?? {};
      if (filtros.certification) expect(filtros.certification).toMatch(/^(L|L\|10)$/);
    }
  });

  it('canal do YouTube tem identificador no formato certo, e emissora tem https', () => {
    for (const c of NO_APP) expect(c.canal).toMatch(/^UC[\w-]{22}$/);
    for (const c of OFICIAIS) expect(c.url.startsWith('https://')).toBe(true);
  });
});
