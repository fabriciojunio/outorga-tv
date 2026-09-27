import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Baixar e instalar · Outorga TV',
  description: 'Como instalar o Outorga TV no celular, na TV e no computador',
};

const RELEASES = 'https://github.com/fabriciojunio/outorga/releases/latest/download';

const PASSOS = [
  {
    titulo: 'Celular Android',
    arquivo: `${RELEASES}/OutorgaTV-celular.apk`,
    rotulo: 'Baixar o app do celular',
    passos: [
      'Toque no botão acima, no próprio celular.',
      'Quando o celular perguntar, permita instalar "apps de fontes desconhecidas" para o navegador.',
      'Abra o Outorga TV e entre com o seu número e a sua senha.',
    ],
  },
  {
    titulo: 'TV com Android (Google TV, TV Box, Fire TV)',
    arquivo: `${RELEASES}/OutorgaTV-tv.apk`,
    rotulo: 'Baixar o app da TV',
    passos: [
      'Na TV, instale o app "Downloader" pela loja (é grátis).',
      'No Downloader, digite o endereço deste botão (ou o atalho curto que aparece na página de Releases do GitHub).',
      'Instale, abra pelo menu de apps da TV e entre com o número e a senha, usando o controle.',
    ],
  },
];

export default function Baixar() {
  return (
    <div className="envolucro secao baixar">
      <h1 className="titulo-pagina">Baixar e instalar</h1>
      <p className="fraco">
        O Outorga TV funciona no celular, na TV e no computador. Em casa, com o computador ligado, ele toca também os
        vídeos que estão no PC. Fora de casa, mostra o catálogo, os canais ao vivo e os jogos do dia.
      </p>

      <div className="grade-baixar">
        {PASSOS.map((p) => (
          <section key={p.titulo} className="cartao">
            <h2>{p.titulo}</h2>
            <a className="botao largo" href={p.arquivo}>
              {p.rotulo}
            </a>
            <ol>
              {p.passos.map((passo) => (
                <li key={passo}>{passo}</li>
              ))}
            </ol>
          </section>
        ))}

        <section className="cartao">
          <h2>Computador (Windows, Mac, Linux)</h2>
          <Link className="botao largo" href="/casa">
            Abrir no navegador
          </Link>
          <ol>
            <li>Abra pelo botão acima, no Chrome ou no Edge.</li>
            <li>Na barra de endereço, clique no ícone de &ldquo;Instalar aplicativo&rdquo; para ele virar um app com ícone.</li>
            <li>
              Quem preferir pode usar o BlueStacks e instalar o mesmo arquivo do celular. Funciona igual.
            </li>
          </ol>
        </section>

        <section className="cartao">
          <h2>TV Samsung ou LG</h2>
          <p className="fraco">
            Essas TVs não instalam arquivo de app (o sistema delas não é Android). Use o navegador da própria TV:
          </p>
          <ol>
            <li>Abra o &ldquo;Internet&rdquo; (Samsung) ou &ldquo;Navegador&rdquo; (LG).</li>
            <li>Digite o endereço deste site seguido de /casa e entre com o número e a senha.</li>
            <li>As setas do controle andam pelos cartazes; o OK abre e o voltar volta.</li>
          </ol>
        </section>
      </div>

      <section className="secao-texto">
        <h2 className="titulo-secao">O que dá para assistir</h2>
        <ul className="lista-clara">
          <li>
            <strong>Vídeos do computador de casa</strong>: tocam inteiros dentro do app, lembram onde parou e passam para
            o próximo episódio.
          </li>
          <li>
            <strong>Canais ao vivo</strong>: CNN Brasil, Record News, SBT News, Jovem Pan, CazéTV e outros tocam aqui
            dentro. Globo, SBT e Record abrem no app oficial de cada emissora.
          </li>
          <li>
            <strong>Filmes, séries e novelas</strong>: separados por serviço (Netflix, Globoplay, Prime...) e por assunto.
            O botão de assistir abre o app do serviço, que precisa estar assinado.
          </li>
          <li>
            <strong>Esportes</strong>: jogos de hoje e de amanhã, com placar ao vivo e onde costuma passar.
          </li>
        </ul>
        <p className="apagado">
          Dados de filmes e séries fornecidos pelo TMDB. Nenhum vídeo de terceiros é copiado ou retransmitido: o que não
          tem transmissão oficial liberada abre no aplicativo de quem tem o direito.
        </p>
      </section>
    </div>
  );
}
