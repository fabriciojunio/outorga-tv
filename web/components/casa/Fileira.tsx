import Link from 'next/link';
import type { Cartaz } from '@/lib/tmdb';

export type ItemDaFileira = {
  chave: string;
  href: string;
  nome: string;
  detalhe?: string;
  capa: string | null;
  progresso?: number;
};

export function paraItem(cartaz: Cartaz): ItemDaFileira {
  return {
    chave: `${cartaz.tipo}:${cartaz.id}`,
    href: `/casa/${cartaz.tipo}/${cartaz.id}`,
    nome: cartaz.nome,
    detalhe: [cartaz.ano, cartaz.tipo === 'serie' ? 'Série' : 'Filme', cartaz.nota ? `★ ${cartaz.nota}` : null]
      .filter(Boolean)
      .join(' · '),
    capa: cartaz.capa,
  };
}

/**
 * Fileira horizontal de cartazes. No celular rola com o dedo, no PC com a
 * roda do mouse ou arrastando, e na TV as setas do controle andam por ela.
 */
export function Fileira({ titulo, itens }: { titulo: string; itens: ItemDaFileira[] }) {
  if (itens.length === 0) return null;
  return (
    <section className="fileira" aria-label={titulo}>
      <h2 className="titulo-secao">{titulo}</h2>
      <div className="fileira-trilho">
        {itens.map((item) => (
          <Link key={item.chave} href={item.href} className="cartaz" prefetch={false}>
            {item.capa ? (
              <img src={item.capa} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="cartaz-sem-capa">{item.nome}</span>
            )}
            {item.progresso !== undefined && (
              <span className="cartaz-progresso" style={{ width: `${Math.round(item.progresso * 100)}%` }} />
            )}
            <span className="cartaz-legenda">
              <span className="nome">{item.nome}</span>
              {item.detalhe && <span className="detalhe">{item.detalhe}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
