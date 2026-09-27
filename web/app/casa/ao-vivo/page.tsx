import type { Metadata } from 'next';
import Link from 'next/link';
import { transmissoes } from '@/lib/casa/aoVivo';
import { OFICIAIS } from '@/lib/casa/canais';

export const metadata: Metadata = { title: 'Ao vivo' };
export const dynamic = 'force-dynamic';

export default async function AoVivo() {
  const lista = await transmissoes();
  const noAr = lista.filter((t) => t.video && !t.bloqueado);
  const soNoYoutube = lista.filter((t) => t.video && t.bloqueado);
  const fora = lista.filter((t) => !t.video);

  return (
    <div className="envolucro casa-fileiras">
      <h1 className="titulo-pagina">TV ao vivo</h1>

      <section className="fileira">
        <h2 className="titulo-secao">Tocam aqui dentro</h2>
        {noAr.length === 0 && <p className="fraco">Nenhum canal transmitindo neste momento.</p>}
        <div className="grade-canais">
          {noAr.map((t) => (
            <Link key={t.canal} href={`/casa/ao-vivo/${t.canal}`} className="canal">
              <img src={`https://i.ytimg.com/vi/${t.video}/mqdefault_live.jpg`} alt="" loading="lazy" />
              <span className="canal-info">
                <span className="selo ruim">AO VIVO</span>
                <strong>{t.nome}</strong>
                <span className="apagado">{t.titulo?.replace(/^AO VIVO:?\s*/i, '')}</span>
              </span>
            </Link>
          ))}
        </div>
        {soNoYoutube.length > 0 && (
          <>
            <h3 className="titulo-secao" style={{ marginTop: 22 }}>
              Ao vivo agora, mas só abrem no YouTube
            </h3>
            <div className="grade-emissoras">
              {soNoYoutube.map((t) => (
                <a key={t.canal} href={`https://www.youtube.com/watch?v=${t.video}`} target="_blank" rel="noreferrer" className="emissora">
                  <strong>{t.nome}</strong>
                  <span>{t.titulo?.replace(/^AO VIVO:?\s*/i, '')}</span>
                </a>
              ))}
            </div>
          </>
        )}
        {fora.length > 0 && (
          <p className="apagado" style={{ marginTop: 14 }}>
            Fora do ar agora: {fora.map((t) => t.nome).join(', ')}. A lista se atualiza sozinha a cada 10 minutos.
          </p>
        )}
      </section>

      <section className="fileira">
        <h2 className="titulo-secao">Emissoras (abre o app ou site oficial)</h2>
        <p className="fraco">
          Globo, SBT e Record só deixam assistir no app ou site delas. O botão leva direto para lá; no celular e na TV
          com Android, abre o aplicativo da emissora se ele estiver instalado.
        </p>
        <div className="grade-emissoras">
          {OFICIAIS.map((c) => (
            <a key={c.nome} href={c.url} target="_blank" rel="noreferrer" className="emissora">
              <strong>{c.nome}</strong>
              <span>{c.texto}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
