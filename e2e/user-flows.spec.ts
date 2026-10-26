import { expect, test } from '@playwright/test';

const authStorageKey = 'sb-playwright-auth-token';

test('redirects unauthenticated visitors to login', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Entrar', { exact: true })).toBeVisible();
    await expect(page.getByText('Entrar com Google', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'docs/e2e-login.png', fullPage: true });
});

test.describe('authenticated user flows', () => {
    test.beforeEach(async ({ page }) => {
        page.on('dialog', (dialog) => dialog.accept());
        await page.route('**/auth/v1/user', (route) => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: '00000000-0000-4000-8000-000000000001',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'e2e@example.test',
                app_metadata: { provider: 'google', providers: ['google'] },
                user_metadata: { full_name: 'E2E User' },
                created_at: new Date().toISOString(),
            }),
        }));
        await page.addInitScript((storageKey) => {
            if (sessionStorage.getItem('playwright-initialized')) return;
            const expiresAt = Math.floor(Date.now() / 1000) + 3600;
            localStorage.clear();
            localStorage.setItem(storageKey, JSON.stringify({
                access_token: 'playwright-access-token',
                refresh_token: 'playwright-refresh-token',
                expires_in: 3600,
                expires_at: expiresAt,
                token_type: 'bearer',
                user: {
                    id: '00000000-0000-4000-8000-000000000001',
                    aud: 'authenticated',
                    app_metadata: { provider: 'google', providers: ['google'] },
                    user_metadata: { full_name: 'E2E User' },
                    created_at: new Date().toISOString(),
                },
            }));
            sessionStorage.setItem('playwright-initialized', 'true');
        }, authStorageKey);
    });

    test('opens every primary tab and shows empty states', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Physique', { exact: true })).toBeVisible();
        await page.screenshot({ path: 'docs/e2e-dashboard.png', fullPage: true });

        const tabs = [
            { label: 'Plano', content: 'Plano do Dia' },
            { label: 'Nutrição', content: 'Sem alimentos cadastrados' },
            { label: 'Treinos', content: 'Sem treinos' },
            { label: 'Histórico', content: 'Sem registros' },
            { label: 'Perfil', content: 'Data de Nascimento' },
            { label: 'Dashboard', content: 'Physique' },
        ];

        for (const tab of tabs) {
            await page.getByText(tab.label, { exact: true }).last().click();
            await expect(page.getByText(tab.content, { exact: true }).first()).toBeVisible();
            if (tab.label !== 'Dashboard' && tab.label !== 'Perfil') {
                await page.screenshot({
                    path: `docs/e2e-${tab.label.toLowerCase()}.png`,
                    fullPage: true,
                });
            }
        }
    });

    test('keeps dashboard and navigation within a mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await expect(page.getByText('Physique', { exact: true })).toBeVisible();
        const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(documentWidth).toBeLessThanOrEqual(390);
    });

    test('creates and reloads a user profile', async ({ page }) => {
        await page.goto('/settings', { waitUntil: 'domcontentloaded' });
        await page.getByPlaceholder('Seu nome').fill('E2E Athlete');
        await page.getByPlaceholder('DD/MM/AAAA').first().fill('01011990');
        await page.getByPlaceholder('175').fill('175,5');
        await page.getByPlaceholder('75', { exact: true }).fill('75,5');
        await page.getByPlaceholder('70', { exact: true }).fill('70,5');
        await page.getByPlaceholder('20', { exact: true }).fill('18,5');
        await page.getByPlaceholder('22').fill('20,5');
        await page.getByPlaceholder('Ex: Perder gordura e ganhar massa').fill('Saúde e condicionamento');
        await page.getByPlaceholder('America/Sao_Paulo').fill('America/Sao_Paulo');
        await page.getByText('Salvar Perfil', { exact: true }).click();

        await expect(page.getByText('E2E Athlete', { exact: true })).toBeVisible();
        await expect(page.getByText('175,5 cm', { exact: true })).toBeVisible();
        await expect(page.getByText(/75,5 kg \(/)).toBeVisible();
        await expect(page.getByText('70,5 kg', { exact: true })).toBeVisible();
        await expect(page.getByText('18,5%', { exact: true })).toBeVisible();
        await expect(page.getByText('20,5%', { exact: true })).toBeVisible();
        await expect(page.getByText('Fuso horário', { exact: true })).toBeVisible();
        await expect(page.getByText('America/Sao_Paulo', { exact: true })).toBeVisible();
        await page.screenshot({ path: 'docs/e2e-profile.png', fullPage: true });
        await page.reload();
        await expect(page.getByText('E2E Athlete', { exact: true })).toBeVisible();
        await expect(page.getByText('America/Sao_Paulo', { exact: true })).toBeVisible();
        await page.goto('/');
        await expect(page.getByText('75,5 kg', { exact: true })).toBeVisible();
        await expect(page.getByText(/Objetivo: 70,5 kg/)).toBeVisible();
        await expect(page.getByText('Progresso indisponível: registre uma medição de peso na data de início da meta ou antes.', { exact: true })).toHaveCount(0);

        await page.goto('/settings');
        await page.getByLabel('Editar perfil').click();
        await page.getByPlaceholder('20').fill('19,5');
        await page.getByText('Salvar Perfil', { exact: true }).click();
        await expect(page.getByText('19,5%', { exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByText('19,5%', { exact: true })).toBeVisible();
    });

    test('does not invent goal progress without a dated baseline measurement', async ({ page }) => {
        await page.goto('/settings', { waitUntil: 'domcontentloaded' });
        await page.getByPlaceholder('Seu nome').fill('E2E Sem Baseline');
        await page.getByPlaceholder('DD/MM/AAAA').first().fill('01011990');
        await page.getByPlaceholder('175').fill('175');
        await page.getByPlaceholder('70', { exact: true }).fill('70');
        await page.getByPlaceholder('Ex: Perder gordura e ganhar massa').fill('Saúde');
        await page.getByText('Salvar Perfil', { exact: true }).click();
        await expect(page.getByText('E2E Sem Baseline', { exact: true })).toBeVisible();
        await page.goto('/');
        await expect(page.getByText('Progresso indisponível: registre uma medição de peso na data de início da meta ou antes.', { exact: true })).toBeVisible();
        await expect(page.getByText('— kg', { exact: true })).toBeVisible();
    });

    test('previews and cancels a routine CSV import without saving', async ({ page }) => {
        await page.goto('/plan', { waitUntil: 'domcontentloaded' });
        const chooserReady = page.waitForEvent('filechooser');
        await page.getByText('Importar CSV', { exact: true }).click();
        const chooser = await chooserReady;
        await chooser.setFiles({
            name: 'rotina.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from([
                'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo',
                'Quarta-feira;06:30;HIT;1x 25min Treino HIT;Cardio',
            ].join('\n')),
        });

        await expect(page.getByText('Prévia da rotina', { exact: true })).toBeVisible();
        await expect(page.getByText('Quarta-feira 06:30 • HIT: 1x 25min Treino HIT (Cardio)')).toBeVisible();
        await page.getByText('Cancelar prévia', { exact: true }).click();
        await expect(page.getByText('Prévia da rotina', { exact: true })).toHaveCount(0);
    });

    test('rejects an invalid routine CSV without showing a save preview', async ({ page }) => {
        await page.goto('/plan', { waitUntil: 'domcontentloaded' });
        const chooserReady = page.waitForEvent('filechooser');
        await page.getByText('Importar CSV', { exact: true }).click();
        const chooser = await chooserReady;
        await chooser.setFiles({
            name: 'rotina-invalida.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from('dia;atividade\nQuarta-feira;Musculação'),
        });

        await expect(page.getByText(/Erro ao importar CSV:/)).toBeVisible();
        await expect(page.getByText('Prévia da rotina', { exact: true })).toHaveCount(0);
    });

    test('offers actual meal-consumption logging for a planned meal', async ({ page }) => {
        await page.goto('/plan', { waitUntil: 'domcontentloaded' });
        const chooserReady = page.waitForEvent('filechooser');
        await page.getByText('Importar CSV', { exact: true }).click();
        const chooser = await chooserReady;
        await chooser.setFiles({
            name: 'refeicao.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from([
                'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo',
                'Segunda-feira;07:30;Café da manhã;Aveia;Nutrição',
            ].join('\n')),
        });
        await page.getByText('Confirmar importação', { exact: true }).click();

        await page.getByText('Todos', { exact: true }).click();
        await expect(page.getByText('Comi conforme planejado', { exact: true })).toBeVisible();
        await page.getByText('Comi conforme planejado', { exact: true }).click();
        await expect(page.getByText('Registrada hoje: consumida', { exact: true })).toBeVisible();
        await page.getByText('Histórico', { exact: true }).last().click();
        await page.getByText('Refeições', { exact: true }).click();
        await expect(page.getByText('Aveia', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Consumida', { exact: true })).toBeVisible();
    });

    test('creates and completes a one-set workout', async ({ page }) => {
        await page.goto('/workout', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Sem treinos', { exact: true })).toBeVisible();
        await page.screenshot({ path: 'docs/e2e-treinos.png', fullPage: true });
        await page.getByLabel('Novo treino').click();
        await page.getByPlaceholder('Ex: Treino de Peito').fill('Treino E2E');
        await page.getByPlaceholder('Ex: Flexões').fill('Flexão');
        await page.getByPlaceholder('Ex: 4', { exact: true }).fill('1');
        await page.getByPlaceholder('Ex: 10', { exact: true }).fill('8');
        await page.getByText('Criar Treino', { exact: true }).click();

        await expect(page.getByText('Treino E2E', { exact: true }).last()).toBeVisible();
        await page.getByText('Treino E2E', { exact: true }).last().click();
        await expect(page.getByText('Flexão', { exact: true })).toBeVisible();
        await page.getByText('Iniciar Treino', { exact: true }).click();
        await expect(page.getByLabel('Repetições realizadas')).toHaveValue('8');
        await page.getByText('✓ Terminei a Série', { exact: true }).click();
        await page.getByText('Finalizar Treino 🏁', { exact: true }).click();

        await expect(page.getByText('Treino E2E', { exact: true }).last()).toBeVisible();
    });

    test('records a manually completed 45-second wall sit with actual duration', async ({ page }) => {
        await page.clock.install({ time: new Date('2026-09-25T10:00:00Z') });
        await page.goto('/workout', { waitUntil: 'domcontentloaded' });
        await page.getByLabel('Novo treino').click();
        await page.getByPlaceholder('Ex: Treino de Peito').fill('Treino cronometrado E2E');
        await page.getByPlaceholder('Ex: Flexões').fill('Wall sit');
        await page.getByPlaceholder('Ex: 4', { exact: true }).fill('1');
        await page.getByPlaceholder('Ex: 45', { exact: true }).fill('45');
        await page.getByText('Criar Treino', { exact: true }).click();

        await page.getByText('Treino cronometrado E2E', { exact: true }).last().click();
        await expect(page.getByText('1 série x 45s', { exact: true })).toBeVisible();
        await page.getByText('Iniciar Treino', { exact: true }).click();
        await page.getByText('▶ Iniciar Série', { exact: true }).click();
        await expect(page.getByText('00:45', { exact: true })).toBeVisible();
        await page.screenshot({ path: 'docs/e2e-wall-sit-timer.png', fullPage: true });

        await page.clock.runFor(44_000);
        await expect(page.getByText('00:01', { exact: true })).toBeVisible();
        await page.getByText('✓ Terminei a Série', { exact: true }).click();
        await expect(page.getByText('Finalizar Treino 🏁', { exact: true })).toBeVisible();

        const savedSets = await page.evaluate(() => {
            const key = Object.keys(localStorage).find((item) => item.startsWith('@physique/workout_sessions/'));
            if (!key) return null;
            const sessions = JSON.parse(localStorage.getItem(key) ?? '[]');
            return sessions.flatMap((session: { sets: unknown[] }) => session.sets);
        });
        expect(savedSets).toEqual([expect.objectContaining({
            setNumber: 1,
            repsCompleted: 0,
            weightUsedKg: null,
            durationSeconds: 44,
        })]);
        await page.screenshot({ path: 'docs/e2e-wall-sit-saved.png', fullPage: true });
    });

    test('records a plank held with a 3 kg plate as a timed set with load', async ({ page }) => {
        await page.clock.install({ time: new Date('2026-09-25T10:00:00Z') });
        await page.goto('/workout', { waitUntil: 'domcontentloaded' });
        await page.getByLabel('Novo treino').click();
        await page.getByPlaceholder('Ex: Treino de Peito').fill('Prancha com anilha E2E');
        await page.getByPlaceholder('Ex: Flexões').fill('Prancha');
        await page.getByPlaceholder('Ex: 4', { exact: true }).fill('1');
        await page.getByPlaceholder('Ex: 45', { exact: true }).fill('45');
        await page.getByPlaceholder('Ex: 4.5', { exact: true }).fill('3');
        await page.getByText('Criar Treino', { exact: true }).click();

        await page.getByText('Prancha com anilha E2E', { exact: true }).last().click();
        await page.getByText('Iniciar Treino', { exact: true }).click();
        await expect(page.getByLabel('Carga realizada em kg')).toHaveValue('3');
        await page.getByText('▶ Iniciar Série', { exact: true }).click();
        await page.clock.runFor(30_000);
        await page.getByText('✓ Terminei a Série', { exact: true }).click();
        await expect(page.getByText('Finalizar Treino 🏁', { exact: true })).toBeVisible();
        await expect(page.getByText(/^Erro ao registrar série/)).toHaveCount(0);

        const savedSets = await page.evaluate(() => {
            const key = Object.keys(localStorage).find((item) => item.startsWith('@physique/workout_sessions/'));
            const sessions = JSON.parse(localStorage.getItem(key ?? '') ?? '[]');
            return sessions.flatMap((session: { sets: unknown[] }) => session.sets);
        });
        expect(savedSets).toEqual([expect.objectContaining({ repsCompleted: 0, weightUsedKg: 3, durationSeconds: 30 })]);
        await page.screenshot({ path: 'docs/e2e-timed-with-load.png', fullPage: true });
    });

    test('uses configured between-set and next-exercise rest durations', async ({ page }) => {
        await page.clock.install({ time: new Date('2026-09-25T10:00:00Z') });
        await page.goto('/workout', { waitUntil: 'domcontentloaded' });
        await page.getByLabel('Novo treino').click();
        await page.getByPlaceholder('Ex: Treino de Peito').fill('Treino de descansos E2E');
        await page.getByPlaceholder('Ex: Flexões').fill('Agachamento');
        await page.getByPlaceholder('Ex: 4', { exact: true }).fill('2');
        await page.getByPlaceholder('Ex: 15', { exact: true }).fill('30');
        await page.getByPlaceholder('Ex: 30', { exact: true }).fill('45');
        await page.getByText('Adicionar Exercício', { exact: true }).click();
        await page.getByPlaceholder('Ex: Flexões').last().fill('Avanço');
        await page.getByPlaceholder('Ex: 4', { exact: true }).last().fill('1');
        await page.getByText('Criar Treino', { exact: true }).click();

        await page.getByText('Treino de descansos E2E', { exact: true }).last().click();
        await expect(page.getByText('Descanso: 30s', { exact: true })).toBeVisible();
        await expect(page.getByText('Transição: 45s', { exact: true })).toBeVisible();
        await page.getByText('Iniciar Treino', { exact: true }).click();
        await page.getByText('✓ Terminei a Série', { exact: true }).click();
        await expect(page.getByText('Descanso 30s', { exact: true })).toBeVisible();
        await expect(page.getByText('1 séries registradas', { exact: true })).toBeVisible();
        await expect(page.getByText('00:30', { exact: true })).toBeVisible();
        await page.clock.runFor(5_000);
        await expect(page.getByText('00:25', { exact: true })).toBeVisible();
        await page.getByText('PULAR DESCANSO', { exact: true }).click();
        await expect(page.getByText('Série 2', { exact: true })).toBeVisible();
        await page.getByText('✓ Terminei a Série', { exact: true }).click();
        await expect(page.getByText('Descanso 45s', { exact: true })).toBeVisible();
        await expect(page.getByText('2 séries registradas', { exact: true })).toBeVisible();
        await expect(page.getByText('00:45', { exact: true })).toBeVisible();
        await page.clock.runFor(10_000);
        await expect(page.getByText('00:35', { exact: true })).toBeVisible();
        await page.getByText('PULAR DESCANSO', { exact: true }).click();
        await expect(page.getByText('Avanço', { exact: true })).toBeVisible();
        await page.getByText('✓ Terminei a Série', { exact: true }).click();
        await expect(page.getByText('3 séries registradas', { exact: true })).toBeVisible();
        await expect(page.getByText('Finalizar Treino 🏁', { exact: true })).toBeVisible();
    });

    test('preserves explicitly configured zero-second rest between sets', async ({ page }) => {
        await page.goto('/workout', { waitUntil: 'domcontentloaded' });
        await page.getByLabel('Novo treino').click();
        await page.getByPlaceholder('Ex: Treino de Peito').fill('Treino sem descanso E2E');
        await page.getByPlaceholder('Ex: Flexões').fill('Flexão');
        await page.getByPlaceholder('Ex: 4', { exact: true }).fill('2');
        await page.getByPlaceholder('Ex: 15', { exact: true }).fill('0');
        await page.getByText('Criar Treino', { exact: true }).click();

        await page.getByText('Treino sem descanso E2E', { exact: true }).last().click();
        await page.getByText('Iniciar Treino', { exact: true }).click();
        await page.getByText('✓ Terminei a Série', { exact: true }).click();
        await expect(page.getByText('Série 2', { exact: true })).toBeVisible();
        await expect(page.getByText('Descanso 0s', { exact: true })).toBeVisible();
    });

    test('saves a manually entered nutrition label', async ({ page }) => {
        await page.goto('/food/scan', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Importar Alimento', { exact: true })).toBeVisible();
        await page.getByPlaceholder('ex: Aveia Quaker').fill('Alimento E2E');
        await page.getByPlaceholder('Por porção, por 100 g, por 100 ml...').fill('Porção');
        await page.getByPlaceholder('Desconhecida').fill('12,5');
        await page.getByPlaceholder('g, ml...').fill('g');
        await page.getByPlaceholder('Valor 1').fill('123,5');
        await page.getByPlaceholder('Valor 2').fill('2,5');
        await page.getByPlaceholder('Valor 3').fill('10');
        await page.getByPlaceholder('Valor 4').fill('1,5');
        await page.getByText('+ Adicionar nutriente', { exact: true }).click();
        await page.getByPlaceholder('Ex.: Vitamina C, Sódio, Açúcares totais').last().fill('Vitamina C');
        await page.getByPlaceholder('Valor 5').fill('12');
        await page.getByPlaceholder('g, mg, µg, kcal...').nth(0).fill('kcal');
        await page.getByPlaceholder('g, mg, µg, kcal...').nth(1).fill('g');
        await page.getByPlaceholder('g, mg, µg, kcal...').nth(2).fill('g');
        await page.getByPlaceholder('g, mg, µg, kcal...').nth(3).fill('g');
        await page.getByPlaceholder('g, mg, µg, kcal...').nth(4).fill('mg');
        await page.getByPlaceholder('% VD').nth(4).fill('20');
        await page.getByPlaceholder('Farinha de aveia, sal...').fill('Aveia integral, vitamina C');
        await page.getByText('Salvar Alimento', { exact: true }).click();

        await expect(page.getByText('✓ Salvo!', { exact: true })).toBeVisible();
        await page.goto('/nutrition');
        await expect(page.getByText('Alimento E2E', { exact: true })).toBeVisible();
        await expect(page.getByText('Energia 123,5 kcal • P 2,5g • C 10g • G 1,5g', { exact: true })).toBeVisible();
        await expect(page.getByText('Porção: 12,5 g', { exact: true })).toBeVisible();
        await expect(page.getByText('Vitamina C: 12 mg (20% VD)', { exact: false })).toBeVisible();
        await expect(page.getByText('Ingredientes: Aveia integral, vitamina C', { exact: true })).toBeVisible();
        await expect(page.getByText('Disponível para planejamento', { exact: true })).toBeVisible();

        await page.getByText('Corrigir rótulo', { exact: true }).click();
        await expect(page.getByText('Corrigir Alimento', { exact: true })).toBeVisible();
        await page.getByPlaceholder('Valor 5').fill('15');
        await page.getByText('Salvar Correções', { exact: true }).click();
        await expect(page.getByText('✓ Salvo!', { exact: true })).toBeVisible();
        await page.goBack();
        await expect(page.getByText('Vitamina C: 15 mg (20% VD)', { exact: false })).toBeVisible();
    });

    test('shows missing nutrition values as incomplete, not zero', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Physique', { exact: true })).toBeVisible();
        await page.goto('/food/scan', { waitUntil: 'networkidle' });
        await expect(page.getByText('Importar Alimento', { exact: true })).toBeVisible();
        const nameInput = page.getByPlaceholder('ex: Aveia Quaker');
        await nameInput.fill('Rótulo incompleto E2E');
        await expect(nameInput).toHaveValue('Rótulo incompleto E2E');
        await page.getByText('Salvar Alimento', { exact: true }).click();
        await expect(page.getByText('✓ Salvo!', { exact: true })).toBeVisible();
        await page.goto('/nutrition');

        await expect(page.getByText(/Tabela incompleta ou com valores incertos/)).toBeVisible();
        await expect(page.getByText('Calorias: Desconhecido', { exact: true })).toBeVisible();
    });

    test('associates visible nutrition labels with their input fields', async ({ page }) => {
        test.fail(true, 'Accessibility gap: Input component renders label text without linking it to TextInput.');

        await page.goto('/food/scan', { waitUntil: 'domcontentloaded' });
        await expect(page.getByLabel('Nome do Alimento *')).toBeVisible();
    });

    test('exposes primary actions as accessible buttons', async ({ page }) => {
        test.fail(true, 'Accessibility gap: shared Button component does not set accessibilityRole="button".');

        await page.goto('/history', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: '+ Registrar Peso' })).toBeVisible();
    });

    test('keeps Brazilian decimal precision when logging weight', async ({ page }) => {
        await page.goto('/history', { waitUntil: 'domcontentloaded' });
        await page.getByText('+ Registrar Peso', { exact: true }).click();
        await page.getByPlaceholder('Ex: 75.5').fill('74,5');
        await page.getByPlaceholder('Ex: 18.5').fill('18,5');
        await page.getByPlaceholder('Ex: 22.0').fill('20,5');
        await page.getByText('Salvar', { exact: true }).click();

        await expect(page.getByText('74,5 kg', { exact: true })).toBeVisible();
        await expect(page.getByText('Gordura: 18,5%', { exact: true })).toBeVisible();
        await expect(page.getByText('Proteína: 20,5%', { exact: true })).toBeVisible();
    });

    test('persists the profile timezone', async ({ page }) => {
        await page.goto('/settings', { waitUntil: 'domcontentloaded' });
        await page.getByPlaceholder('Seu nome').fill('E2E Timezone');
        await page.getByPlaceholder('DD/MM/AAAA').first().fill('01011990');
        await page.getByPlaceholder('175').fill('175');
        await page.getByPlaceholder('70', { exact: true }).fill('70');
        await page.getByPlaceholder('Ex: Perder gordura e ganhar massa').fill('Saúde');
        await page.getByPlaceholder('America/Sao_Paulo').fill('Pacific/Auckland');
        await page.getByText('Salvar Perfil', { exact: true }).click();
        await expect(page.getByText('Pacific/Auckland', { exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByText('Pacific/Auckland', { exact: true })).toBeVisible();
    });

    test('records, corrects, and deletes an independent body-fat measurement', async ({ page }) => {
        await page.goto('/history', { waitUntil: 'domcontentloaded' });
        await page.getByText('+ Registrar Peso', { exact: true }).click();
        await page.getByPlaceholder('Ex: 18.5').fill('18,5');
        await page.getByPlaceholder('DD/MM/AAAA').last().fill('01/01/2025');
        await page.getByPlaceholder('HH:MM').fill('12:00');
        await page.getByText('Salvar', { exact: true }).click();
        await expect(page.getByText('Gordura: 18,5%', { exact: true })).toBeVisible();
        await expect(page.getByText('Medição corporal', { exact: true })).toBeVisible();

        await page.getByText('Corrigir medição', { exact: true }).click();
        await page.locator('input').nth(1).fill('19,5');
        await page.getByText('Salvar medição', { exact: true }).click();
        await expect(page.getByText('Gordura: 19,5%', { exact: true })).toBeVisible();

        await page.getByText('Excluir medição', { exact: true }).click();
        await expect(page.getByText('Sem registros', { exact: true })).toBeVisible();
    });

    test('requires exam date before upload', async ({ page }) => {
        test.fail(true, 'Requirement gap: exam upload flow has no examination-date field.');

        await page.goto('/settings', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Data do exame', { exact: true })).toBeVisible();
    });
});
