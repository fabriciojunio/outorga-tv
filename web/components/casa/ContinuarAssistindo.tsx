'use client';

import { useMemo } from 'react';
import { useNoNavegador } from '@/lib/useNoNavegador';
import { emAndamento } from '@/lib/casa/progresso';
import { Fileira, type ItemDaFileira } from './Fileira';

export function ContinuarAssistindo() {
  // Texto, e não a lista: lista nova a cada leitura faria o React renderizar sem parar.
  const salvo = useNoNavegador(() => JSON.stringify(emAndamento()), '[]', true);
  const itens = useMemo<ItemDaFileira[]>(
    () =>
      (JSON.parse(salvo) as ReturnType<typeof emAndamento>).map((p) => ({
        chave: p.id,
        href: `/casa/tocar/${p.id}`,
        nome: p.nome,
        detalhe: `Faltam ${Math.max(1, Math.round((p.duracao - p.posicao) / 60))} min`,
        capa: p.capa,
        progresso: p.duracao > 0 ? p.posicao / p.duracao : 0,
      })),
    [salvo],
  );

  return <Fileira titulo="Continuar assistindo" itens={itens} />;
}
