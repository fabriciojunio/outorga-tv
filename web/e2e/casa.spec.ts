import { expect, test, type Page } from '@playwright/test';

const LOGIN = process.env.E2E_LOGIN ?? '';
const SENHA = process.env.E2E_SENHA ?? '';
const PASTA = process.env.E2E_FOTOS;

test.skip(!LOGIN || !SENHA, 'defina E2E_LOGIN e E2E_SENHA');

async function entrar(page: Page) {
  await page.goto('/casa');
  await expect(page).toHaveURL(/\/casa\/entrar/);
  await page.getByLabel('Número').fill(LOGIN);
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/casa$/);
}

/** Imagens na tela carregadas de verdade (largura natural maior que zero). */
async function imagensVisiveisCarregadas(page: Page) {
  await page.waitForFunction(
    () =>
      [...document.images]
        .filter((i) => {
          const r = i.getBoundingClientRect();
          // Só o que está dentro da tela nos dois sentidos: cartaz escondido
          // à direita da fileira não carrega até alguém rolar, de propósito.
          return r.width > 0 && r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
        })
        .every((i) => i.complete && i.naturalWidth > 0),
    undefined,
    { timeout: 15_000 },
  );
}

async function foto(page: Page, nome: string, projeto: string) {
  if (!PASTA) return;
  await imagensVisiveisCarregadas(page).catch(() => undefined);
  await page.screenshot({ path: `${PASTA}/${projeto}-${nome}.png`, fullPage: false });
}

test('entra, vê as prateleiras e abre um título', async ({ page }, info) => {
  await entrar(page);
  await expect(page.getByText(/Olá, /)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Novelas brasileiras' })).toBeVisible();
  // Capa de cartaz é o que mais aparece na tela: tem que chegar.
  await imagensVisiveisCarregadas(page);
  await foto(page, 'inicio', info.project.name);

  await page.getByRole('region', { name: 'Novelas brasileiras' }).getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'Onde assistir no Brasil' })).toBeVisible();
  await foto(page, 'titulo', info.project.name);
});

test('todas as páginas do menu abrem', async ({ page }, info) => {
  await entrar(page);
  for (const [caminho, titulo] of [
    ['/casa/filmes', 'Filmes'],
    ['/casa/series', 'Séries e novelas'],
    ['/casa/infantil', 'Infantil'],
    ['/casa/ao-vivo', 'TV ao vivo'],
    ['/casa/esportes', 'Esportes'],
    ['/casa/no-pc', 'No seu PC'],
  ] as const) {
    await page.goto(caminho);
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
    await foto(page, caminho.split('/').pop()!, info.project.name);
  }
});

test('a página não rola para o lado no celular', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular');
  await entrar(page);
  for (const caminho of ['/casa', '/casa/ao-vivo', '/casa/esportes', '/casa/serie/1396', '/', '/baixar']) {
    await page.goto(caminho);
    const larguras = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(larguras[0], `${caminho} mais largo que a tela`).toBeLessThanOrEqual(larguras[1]! + 1);
  }
});

test('busca acha novela pelo nome sem acento', async ({ page }) => {
  await entrar(page);
  await page.goto('/casa/busca?q=avenida brasil');
  await expect(page.getByRole('link', { name: /Avenida Brasil/ }).first()).toBeVisible();
});

test('controle remoto: setas andam pelos cartazes e voltar volta', async ({ page }, info) => {
  test.skip(info.project.name !== 'tv');
  await entrar(page);
  await expect(page.locator('html[data-controle="pronto"]')).toHaveCount(1);

  // A primeira seta foca algo que está na tela.
  await page.keyboard.press('ArrowDown');
  const primeiro = await page.evaluate(() => document.activeElement?.tagName);
  expect(['A', 'BUTTON', 'INPUT']).toContain(primeiro);

  // Desce até um cartaz e anda para a direita dentro da fileira.
  for (let i = 0; i < 8; i++) {
    const noCartaz = await page.evaluate(() => document.activeElement?.classList.contains('cartaz'));
    if (noCartaz) break;
    await page.keyboard.press('ArrowDown');
  }
  expect(await page.evaluate(() => document.activeElement?.classList.contains('cartaz'))).toBe(true);
  const antes = await page.evaluate(() => (document.activeElement as HTMLAnchorElement).href);
  await page.keyboard.press('ArrowRight');
  const depois = await page.evaluate(() => (document.activeElement as HTMLAnchorElement).href);
  expect(depois).not.toBe(antes);
  const fileiraIgual = await page.evaluate(
    ([a]) => document.activeElement?.closest('.fileira') === document.querySelector(`a[href="${new URL(a!).pathname}"]`)?.closest('.fileira'),
    [antes],
  );
  expect(fileiraIgual).toBe(true);
  await foto(page, 'foco-no-cartaz', info.project.name);

  // OK abre, voltar volta.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Onde assistir no Brasil' })).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(page).toHaveURL(/\/casa$/);
});

test('vídeo do PC toca, avança pelo controle e guarda onde parou', async ({ page }, info) => {
  await entrar(page);
  await page.goto('/casa/serie/1396');
  await page.getByRole('link', { name: /T1 · E01/ }).click();
  await expect(page).toHaveURL(/\/casa\/tocar\//);

  const video = page.locator('video');
  await video.evaluate((v: HTMLVideoElement) => {
    v.muted = true;
    return v.play();
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(1);
  expect(await video.evaluate((v: HTMLVideoElement) => v.error)).toBeNull();

  // A legenda .srt ao lado do arquivo vira faixa de legenda.
  expect(await video.evaluate((v: HTMLVideoElement) => v.textTracks.length)).toBe(1);

  if (info.project.name === 'tv') {
    await page.locator('.palco-casa').focus();
    const antes = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
    await page.keyboard.press('ArrowRight');
    const depois = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
    expect(depois - antes).toBeGreaterThan(8);
  }

  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = 20;
    v.pause();
  });
  await foto(page, 'player', info.project.name);
  const guardado = await page.evaluate(() => localStorage.getItem('outorga.casa.progresso'));
  expect(guardado).toContain('"posicao":20');

  await page.goto('/casa');
  await expect(page.getByRole('heading', { name: 'Continuar assistindo' })).toBeVisible();
});

test('trailer abre por cima e fecha', async ({ page }) => {
  await entrar(page);
  await page.goto('/casa/filme/603');
  await page.getByRole('button', { name: /Ver trailer/ }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar trailer' }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('canal ao vivo toca dentro do app', async ({ page }, info) => {
  await entrar(page);
  await page.goto('/casa/ao-vivo');
  const canais = page.locator('.canal');
  test.skip((await canais.count()) === 0, 'nenhum canal ao vivo neste momento');
  await canais.first().click();
  // Toca embutido, ou (transmissão que proíbe) oferece abrir no YouTube.
  await expect(page.locator('iframe.quadro-ao-vivo, .aviso-bloqueado').first()).toBeVisible();
  await foto(page, 'canal', info.project.name);
});

test('sair desconecta', async ({ page }) => {
  await entrar(page);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/casa\/entrar/);
  await page.goto('/casa/filmes');
  await expect(page).toHaveURL(/\/casa\/entrar\?voltar=%2Fcasa%2Ffilmes/);
});
