import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fileira, paraItem } from '@/components/casa/Fileira';
import { Trailer } from '@/components/casa/Trailer';
import { listarBiblioteca, type ArquivoDeVideo } from '@/lib/biblioteca';
import { acervo } from '@/lib/casa/acervo';
import { linkDoServico } from '@/lib/casa/servicos';
import type { Detalhe, Provedor, Tipo } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

type Parametros = { params: Promise<{ tipo: string; id: string }> };

function lerParametros(tipo: string, id: string): { tipo: Tipo; id: number } | null {
  const numero = Number(id);
  if ((tipo !== 'filme' && tipo !== 'serie') || !Number.isSafeInteger(numero) || numero <= 0) return null;
  return { tipo, id: numero };
}

async function carregar(tipo: string, id: string): Promise<Detalhe> {
  const lido = lerParametros(tipo, id);
  if (!lido) notFound();
  try {
    return await acervo.titulo(lido.tipo, lido.id);
  } catch {
    notFound();
  }
}

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const { tipo, id } = await params;
  const lido = lerParametros(tipo, id);
  if (!lido) return {};
  const titulo = await acervo.titulo(lido.tipo, lido.id).catch(() => null);
  return titulo ? { title: titulo.nome, description: titulo.sinopse ?? undefined } : {};
}

function Provedores({ titulo, lista, nome }: { titulo: string; lista: Provedor[]; nome: string }) {
  if (lista.length === 0) return null;
  return (
    <div className="provedores">
      <span className="apagado">{titulo}</span>
      <div className="linha">
        {lista.map((p) => {
          const conteudo = (
            <>
              {p.logo && <img src={p.logo} alt="" width={28} height={28} loading="lazy" />}
              {p.nome}
            </>
          );
          const link = linkDoServico(p.nome, nome);
          return link ? (
            <a key={p.nome} className="provedor" href={link} target="_blank" rel="noreferrer" title={`Abrir no ${p.nome}`}>
              {conteudo}
            </a>
          ) : (
            <span key={p.nome} className="provedor" title={p.nome}>
              {conteudo}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const rotuloDoArquivo = (a: ArquivoDeVideo) =>
  a.temporada !== null ? `T${a.temporada} · E${String(a.episodio).padStart(2, '0')}` : 'Assistir do seu PC';

export default async function PaginaDoTitulo({ params }: Parametros) {
  const { tipo, id } = await params;
  const t = await carregar(tipo, id);

  const noPc = (await listarBiblioteca().catch(() => [] as ArquivoDeVideo[]))
    .filter((a) => a.tmdb?.id === t.id && a.tmdb.tipo === t.tipo)
    .sort((a, b) => (a.temporada ?? 0) - (b.temporada ?? 0) || (a.episodio ?? 0) - (b.episodio ?? 0));

  const onde = t.ondeAssistir;
  const temOnde = onde.assinatura.length + onde.aluguel.length + onde.compra.length > 0;
  const ficha = [
    t.ano,
    t.classificacao ? `${t.classificacao}${/^\d+$/.test(t.classificacao) ? ' anos' : ''}` : null,
    t.duracaoMinutos ? `${Math.floor(t.duracaoMinutos / 60) ? `${Math.floor(t.duracaoMinutos / 60)}h` : ''}${t.duracaoMinutos % 60}min` : null,
    t.temporadas ? `${t.temporadas} temporada${t.temporadas > 1 ? 's' : ''}` : null,
    t.nota ? `★ ${t.nota}` : null,
  ].filter(Boolean);

  return (
    <>
      <section className="destaque destaque-titulo" style={{ backgroundImage: t.fundo ? `url(${t.fundo})` : undefined }}>
        <div className="destaque-sombra">
          <div className="envolucro titulo-topo">
            {t.capa && <img className="titulo-capa" src={t.capa} alt="" />}
            <div>
              <h1>{t.nome}</h1>
              {t.nomeOriginal && t.nomeOriginal !== t.nome && <p className="apagado">{t.nomeOriginal}</p>}
              <p className="ficha">{ficha.join(' · ')}</p>
              {t.generos.length > 0 && <p className="apagado">{t.generos.join(', ')}</p>}
              {t.sinopse && <p className="sinopse">{t.sinopse}</p>}
              <div className="acoes">
                {noPc.length === 1 && noPc[0] && (
                  <Link href={`/casa/tocar/${noPc[0].id}`} className="botao">
                    ▶ Assistir do seu PC
                  </Link>
                )}
                {t.trailer && <Trailer chave={t.trailer} nome={t.nome} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="envolucro casa-fileiras">
        {noPc.length > 1 && (
          <section className="fileira">
            <h2 className="titulo-secao">No seu PC</h2>
            <div className="episodios">
              {noPc.map((a) => (
                <Link key={a.id} href={`/casa/tocar/${a.id}`} className="botao secundario">
                  ▶ {rotuloDoArquivo(a)}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="fileira">
          <h2 className="titulo-secao">Onde assistir no Brasil</h2>
          {temOnde ? (
            <>
              <Provedores titulo="Na assinatura (toque para abrir)" lista={onde.assinatura} nome={t.nome} />
              <Provedores titulo="Para alugar" lista={onde.aluguel} nome={t.nome} />
              <Provedores titulo="Para comprar" lista={onde.compra} nome={t.nome} />
              {onde.link && (
                <a className="apagado" href={onde.link} target="_blank" rel="noreferrer">
                  Ver os links de cada serviço no TMDB (dados do JustWatch)
                </a>
              )}
            </>
          ) : (
            <p className="fraco">Nenhum serviço oferece este título no Brasil agora.</p>
          )}
        </section>

        {t.elenco.length > 0 && (
          <section className="fileira">
            <h2 className="titulo-secao">Elenco</h2>
            <div className="fileira-trilho elenco">
              {t.elenco.map((p) => (
                <div key={`${p.nome}-${p.personagem}`} className="pessoa">
                  {p.foto ? <img src={p.foto} alt="" loading="lazy" /> : <span className="pessoa-sem-foto" />}
                  <strong>{p.nome}</strong>
                  <span className="apagado">{p.personagem}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <Fileira titulo="Quem viu este também viu" itens={t.parecidos.map(paraItem)} />
      </div>
    </>
  );
}
