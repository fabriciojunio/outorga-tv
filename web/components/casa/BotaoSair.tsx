/**
 * Formulário comum, sem JavaScript: funciona mesmo se o toque vier antes de
 * a página terminar de carregar, o que no celular lento e na TV acontece.
 */
export function BotaoSair() {
  return (
    <form method="post" action="/api/casa/sair" className="form-sair">
      <button className="botao-texto" type="submit">
        Sair
      </button>
    </form>
  );
}
