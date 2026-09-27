import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { transmissoes } from '@/lib/casa/aoVivo';

export const dynamic = 'force-dynamic';

type Parametros = { params: Promise<{ canal: string }> };

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const { canal } = await params;
  const t = (await transmissoes()).find((x) => x.canal === canal);
  return t ? { title: `${t.nome} ao vivo` } : {};
}

/**
 * Assistir um canal. Os botões de canal anterior e próximo pulam só entre
 * os que estão no ar, como trocar de canal no controle da TV.
 */
export default async function Canal({ params }: Parametros) {
  const { canal } = await params;
  const noAr = (await transmissoes()).filter((t) => t.video);
  const indice = noAr.findIndex((t) => t.canal === canal);
  const atual = noAr[indice];
  if (!atual?.video) notFound();

  const anterior = noAr[(indice - 1 + noAr.length) % noAr.length];
  const proximo = noAr[(indice + 1) % noAr.length];

  return (
    <div className="envolucro secao">
      <div className="espalha" style={{ marginBottom: 12 }}>
        <h1 className="titulo-player">
          <span className="selo ruim">AO VIVO</span> {atual.nome}
        </h1>
        <Link href="/casa/ao-vivo" className="apagado">
          Todos os canais
        </Link>
      </div>
      <div className="palco">
        <iframe
          className="quadro-ao-vivo"
          src={`https://www.youtube-nocookie.com/embed/${atual.video}?autoplay=1&rel=0&hl=pt-BR`}
          title={`${atual.nome} ao vivo`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      {atual.titulo && <p className="fraco">{atual.titulo}</p>}
      {noAr.length > 1 && anterior && proximo && (
        <div className="acoes" style={{ marginTop: 14 }}>
          <Link href={`/casa/ao-vivo/${anterior.canal}`} className="botao secundario">
            ◀ {anterior.nome}
          </Link>
          <Link href={`/casa/ao-vivo/${proximo.canal}`} className="botao secundario">
            {proximo.nome} ▶
          </Link>
        </div>
      )}
    </div>
  );
}
