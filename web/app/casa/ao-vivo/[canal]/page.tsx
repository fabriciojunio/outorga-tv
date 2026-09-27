import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlayerAoVivo } from '@/components/casa/PlayerAoVivo';
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
 * os que tocam aqui dentro, como trocar de canal no controle da TV.
 */
export default async function Canal({ params }: Parametros) {
  const { canal } = await params;
  const todos = await transmissoes();
  const atual = todos.find((t) => t.canal === canal && t.video);
  if (!atual?.video) notFound();

  const tocaveis = todos.filter((t) => t.video && !t.bloqueado);
  const indice = tocaveis.findIndex((t) => t.canal === canal);
  const anterior = indice >= 0 ? tocaveis[(indice - 1 + tocaveis.length) % tocaveis.length] : tocaveis[0];
  const proximo = indice >= 0 ? tocaveis[(indice + 1) % tocaveis.length] : tocaveis[0];

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
        <PlayerAoVivo video={atual.video} nome={atual.nome} />
      </div>
      {atual.titulo && <p className="fraco">{atual.titulo}</p>}
      {tocaveis.length > 1 && anterior && proximo && (
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
