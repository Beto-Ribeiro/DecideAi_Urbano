import { test, expect } from '@playwright/test';

test.describe('DecideAI — E.E. Engenheiro Urbano Alves de Souza Pereira (E2E)', () => {
  test('1. Identidade da escola visível na urna e login de eleitor somente com RA (sem campo de dígito)', async ({
    page,
  }) => {
    await page.goto('/');

    // Verifica presença do nome oficial da escola
    await expect(
      page.getByText('E.E. Engenheiro Urbano Alves de Souza Pereira').first()
    ).toBeVisible();

    // Verifica que NÃO existe campo de dígito de RA na interface
    const digitoInputs = await page.locator('input[placeholder*="Dígito"], input[name*="digito"]').count();
    expect(digitoInputs).toBe(0);

    // Faz login apenas com o RA de teste e chega na tela de confirmação com botão "Não sou eu"
    const raInput = page.locator('input[type="text"], input[inputmode="numeric"]').first();
    await raInput.fill('00010948523');
    await page.getByRole('button', { name: /Identificar|Continuar|Entrar|Confirmar RA/i }).first().click();

    await expect(page.getByText('Ana Clara Martins de Oliveira')).toBeVisible();
    await expect(page.getByRole('button', { name: /Não sou eu/i })).toBeVisible();
  });

  test('2. Login no Painel Administrativo (/admin) com sessão JWT assinada', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page.getByText('Painel Administrativo')).toBeVisible();

    await page.locator('#admin-password').fill('Urbano@Admin2026!');
    await page.getByRole('button', { name: /Entrar no Painel Administrativo/i }).click();

    await expect(page.getByText('Total de Votos na Urna')).toBeVisible();
    await expect(page.getByText('Apuração Agregada por Chapa')).toBeVisible();
  });

  test('3. Login no Portal da Chapa (/chapa — somente leitura) com sessão própria', async ({
    page,
  }) => {
    await page.goto('/chapa');
    await expect(page.getByText('Acesso da Chapa Homologada')).toBeVisible();

    await page.locator('#chapa-usuario').fill('chapa10');
    await page.locator('#chapa-senha').fill('VozAtiva@2026');
    await page.getByRole('button', { name: /Acessar Painel da Chapa/i }).click();

    await expect(page.getByText(/Portal de Transparência da Chapa/i)).toBeVisible();
  });

  test('4. Health-check leve responde 200 OK com identidade da E.E. Urbano', async ({
    request,
  }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.escola).toContain('E.E. Engenheiro Urbano Alves de Souza Pereira');
  });
});
