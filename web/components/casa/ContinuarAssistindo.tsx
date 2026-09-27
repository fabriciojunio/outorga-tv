'use client';

import { useEffect, useState } from 'react';
import { emAndamento } from '@/lib/casa/progresso';
import { Fileira, type ItemDaFileira } from './Fileira';

export function ContinuarAssistindo() {
  const [itens, setItens] = useState<ItemDaFileira[]>([]);

  useEffect(() => {
    setItens(
      emAndamento().map((p) => ({
        chave: p.id,
        href: `/casa/tocar/${p.id}`,
        nome: p.nome,
        detalhe: `Faltam ${Math.max(1, Math.round((p.duracao - p.posicao) / 60))} min`,
        capa: p.capa,
        progresso: p.duracao > 0 ? p.posicao / p.duracao : 0,
      })),
    );
  }, []);

  return <Fileira titulo="Continuar assistindo" itens={itens} />;
}
