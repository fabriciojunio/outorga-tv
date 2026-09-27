import { beforeAll, describe, expect, it } from 'vitest';
import { assinarSessao, DURACAO_DA_SESSAO_S, lerSessao } from '@/lib/casa/sessao';
import { bloqueadoAte, conferirSenha, gerarHash, limparErros, registrarErro } from '@/lib/casa/usuarios';

beforeAll(async () => {
  process.env.CASA_SEGREDO = 'segredo-de-teste-com-bem-mais-de-trinta-e-dois-caracteres';
  process.env.CASA_USUARIOS = JSON.stringify([{ login: '3', nome: 'Raquel', hash: await gerarHash('Novela-de-teste') }]);
});

describe('sessão assinada', () => {
  it('lê de volta o que assinou', async () => {
    const valor = await assinarSessao('3', 'Raquel');
    expect(await lerSessao(valor)).toMatchObject({ login: '3', nome: 'Raquel' });
  });

  it('recusa corpo trocado com a assinatura antiga', async () => {
    const [, assinatura] = (await assinarSessao('3', 'Raquel')).split('.');
    const falso = Buffer.from(JSON.stringify({ login: '1', nome: 'X', expira: 9_999_999_999 })).toString('base64url');
    expect(await lerSessao(`${falso}.${assinatura}`)).toBeNull();
  });

  it('recusa sessão vencida', async () => {
    const antiga = await assinarSessao('3', 'Raquel', Date.now() - (DURACAO_DA_SESSAO_S + 60) * 1000);
    expect(await lerSessao(antiga)).toBeNull();
  });

  it('recusa assinada com outro segredo', async () => {
    const valor = await assinarSessao('3', 'Raquel');
    const segredo = process.env.CASA_SEGREDO;
    process.env.CASA_SEGREDO = 'outro-segredo-tambem-com-mais-de-trinta-e-dois-caracteres';
    expect(await lerSessao(valor)).toBeNull();
    process.env.CASA_SEGREDO = segredo;
  });

  it.each([undefined, '', 'sem-ponto', 'a.b.c', '!!!.???'])('não quebra com lixo: %s', async (lixo) => {
    expect(await lerSessao(lixo)).toBeNull();
  });
});

describe('senha', () => {
  it('confere a certa e recusa a errada', async () => {
    expect((await conferirSenha('3', 'Novela-de-teste'))?.nome).toBe('Raquel');
    expect(await conferirSenha('3', 'novela-de-teste')).toBeNull();
    expect(await conferirSenha('9', 'Novela-de-teste')).toBeNull();
  });

  it('o hash não carrega a senha nem usa $ (o Next expande $ no .env)', async () => {
    const hash = await gerarHash('Senha123');
    expect(hash).not.toContain('Senha123');
    expect(hash).not.toContain('$');
    expect(hash.split(':')).toHaveLength(3);
  });
});

describe('freio contra tentativa de senha', () => {
  it('cinco erros no mesmo login bloqueiam; acertar limpa', () => {
    const chaves = ['login:teste-freio'];
    for (let i = 0; i < 4; i++) registrarErro(chaves);
    expect(bloqueadoAte(chaves)).toBeNull();
    registrarErro(chaves);
    expect(bloqueadoAte(chaves)).toBeGreaterThan(Date.now());
    limparErros(chaves);
    expect(bloqueadoAte(chaves)).toBeNull();
  });

  it('por endereço tolera mais, para não trancar a casa inteira', () => {
    const chaves = ['ip:203.0.113.9'];
    for (let i = 0; i < 19; i++) registrarErro(chaves);
    expect(bloqueadoAte(chaves)).toBeNull();
    registrarErro(chaves);
    expect(bloqueadoAte(chaves)).not.toBeNull();
  });

  it('o bloqueio passa depois de 15 minutos', () => {
    const chaves = ['login:teste-tempo'];
    const agora = Date.now();
    for (let i = 0; i < 5; i++) registrarErro(chaves, agora);
    expect(bloqueadoAte(chaves, agora + 16 * 60_000)).toBeNull();
  });
});
