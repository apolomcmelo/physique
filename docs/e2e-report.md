# Relatório E2E — estado observado

Execução em Chromium no Expo Web, em 25/10/2026. Sem alterações em código de produção.

## Resultado

`npx playwright test`: **11 fluxos passam; 7 lacunas de requisito reproduzidas e marcadas como falhas esperadas** com `test.fail` para distingui-las de regressões inesperadas. Playwright reporta esses casos esperados como testes aceitos, não como aprovações funcionais.

Atualização da implementação ALI: o fluxo de registrar uma refeição planejada como consumida e encontrá-la no histórico foi implementado e validado com `npx playwright test -g "actual meal-consumption"` (1 fluxo passou em modo local). Portanto, a contagem acima é o resultado histórico da execução inicial, não o estado atual completo. A tabela abaixo deve ser lida com a linha ALI como mitigada localmente; os outros gaps e a integração com Supabase implantado ainda não foram reexecutados/validados nesta atualização.

Fluxos exercitados: redirecionamento sem sessão; seis abas; viewport de 390 px; criação e persistência de perfil; prévia/cancelamento e rejeição de CSV inválido; criação e conclusão de treino de uma série; exercício cronometrado Wall sit; descansos entre séries e entre exercícios; descanso configurado como zero; cadastro manual de alimento.

A sessão autenticada e `/auth/v1/user` foram simulados; dados usam modo local. Google OAuth, Supabase implantado e sincronização real não foram exercitados. Câmera, permissões, Safari/iOS, push, recuperação offline e fluxo LLM também não foram validados.

Validação posterior da trilha de decimais: três fluxos Chromium passaram para perfil pt-BR, cadastro manual de rótulo com decimais por vírgula e registro de peso `74,5 kg`. O fluxo do perfil também verifica exibição localizada; o registro de peso confirmou o valor exibido e salvo como `74,5`, sem truncamento. Isso não altera a contagem da execução histórica acima.

Validação posterior MED/P4: fluxos Chromium passaram para persistência do perfil e fuso IANA, ausência de baseline inventado, uso da leitura inicial como baseline, edição do percentual no perfil, medição corporal independente com correção/exclusão e decimal de peso. A validação também passou com 66 suítes/525 testes Jest, `npx tsc --noEmit` e export web (24 rotas). Migration `015_p4_weight_goals.sql` e isolamento/RLS ainda não foram executados contra PostgreSQL/Supabase; a agenda por fuso de perfil permanece pendente da decisão O1.

## Verificação aprofundada de treinos

- Wall sit de 45 s exibiu contagem `00:45`; conclusão manual em 44 s persistiu `durationSeconds: 44`, `repsCompleted: 0` e `weightUsedKg: null` no armazenamento local.
- Configuração de 30 s entre séries e 45 s antes do próximo exercício foi respeitada; contagens regressivas avançaram para `00:25` e `00:35`, respectivamente, após avanço controlado do relógio. Três séries foram gravadas durante a progressão.
- Descanso explícito `0` também foi aceito e avançou sem o padrão de 60 s. Suspeita inicial de perda do zero não se confirmou: formulário recebe texto `"0"`, que é truthy em JavaScript, e teste E2E passou.
- Testes de componente existentes também passaram para timer encerrado antes do prazo, expiração, descanso padrão, pulo de descanso, gravação parcial, retomada, tentativa após erro e finalização.

Capturas do fluxo cronometrado:

- [Timer Wall sit em 45 s](./e2e-wall-sit-timer.png)
- [Série Wall sit salva](./e2e-wall-sit-saved.png)

O erro relatado em produção **não foi reproduzido**: E2E usa repositório local, não Supabase implantado. Cliente envia `duration_seconds` na chamada RPC; migration `012_p1_actual_workout.sql` adiciona coluna e atualiza `save_session_atomically` para persistir duração real. Ausência dessa migration explicaria duração não persistida, mas não explica sozinha falha ao salvar: RPC anterior ignora esse campo extra e pode gravar o restante da série. É necessário conferir migration/RPC implantadas e mensagem exata do Supabase.

A tela ainda exibe mensagem genérica (`Erro ao registrar série`), mas agora escreve logs estruturados no console. Para falhas de série, procure `[workout] set completion failed` (inclui treino/sessão/exercício, série, tipo cronometrado e duração calculada) e `[workout.persistence] RPC returned error` (inclui RPC, número de séries, durações enviadas e `message`, `code`, `details`, `hint` do Supabase). Falhas anteriores à resposta da RPC usam os rótulos `authenticated user lookup failed`, `session payload preparation failed` e `RPC request threw`. Logs de configuração usam `[workout.form] save failed`, com índices e durações dos exercícios cronometrados. Não registram nome, peso, repetições nem credenciais.

Em produção, reproduza o erro e consulte o console do navegador ou logs do dispositivo; envie os registros `[workout]` e `[workout.persistence]` para localizar camada e resposta Supabase. Sessão expirando, erros de rede ou schema/RPC ausente agora deixam causa detalhada visível no log, enquanto mensagem visual continua genérica.

## Capturas de tela

Capturas reais do navegador durante testes, com dados sintéticos isolados; telas sem registros mostram estados vazios:

- [Login](./e2e-login.png)
- [Dashboard](./e2e-dashboard.png)
- [Plano](./e2e-plano.png)
- [Nutrição](./e2e-nutrição.png)
- [Treinos](./e2e-treinos.png)
- [Histórico](./e2e-histórico.png)
- [Perfil preenchido](./e2e-profile.png)

Dashboard em estado vazio não mostra erro após configurar usuário de teste. Teste de viewport móvel verificou ausência de rolagem horizontal no dashboard; não substitui validação visual em aparelhos.

## Bugs e lacunas reproduzidos

| Prioridade | Área | Evidência e impacto |
|---|---|---|
| Mitigada localmente | Consumo de refeições | `plan.tsx` agora registra confirmação, pulo, substituição/notas e refeição avulsa; `history.tsx` lista consumos reais com correção e exclusão confirmada. O armazenamento Supabase requer a migration `013_p4_meal_consumptions.sql`; deploy/RLS ainda não verificados. |
| Alta | Tabela nutricional | Parcialmente mitigada: entradas decimais usam parsing estrito e campos vazios/malformados são bloqueados em vez de virarem `0`/`100 g`. Rótulos incompletos ainda não podem ser salvos como incompletos e vitaminas/unidades/base não podem ser registradas; depende do modelo extensível de P5. [scan.tsx](../app/food/scan.tsx) |
| Mitigada localmente | Peso decimal pt-BR | `74,5` é interpretado e exibido como `74,5 kg`; texto residual e separadores ambíguos são rejeitados. Perfil, correções de carga, cadastro de alimentos e OCR também usam o parser estrito. Cobertura unitária/UI/E2E aprovada localmente; Supabase implantado não foi exercitado. [history.tsx](<../app/(tabs)/history.tsx>) |
| Mitigada localmente | Medições e meta | Histórico datado é fonte da leitura mais recente por indicador e aceita registro parcial retroativo, correção e exclusão. Metas preservam início/alvo anteriores e Dashboard não inventa baseline; perfil e telas recarregam ao receber foco. Migration `015_p4_weight_goals.sql` ainda não foi aplicada/testada em PostgreSQL/Supabase. [settings.tsx](<../app/(tabs)/settings.tsx>), [history.tsx](<../app/(tabs)/history.tsx>), [index.tsx](<../app/(tabs)/index.tsx>) |
| Parcialmente mitigada | Fuso horário | Perfil agora valida e persiste um fuso IANA. A agenda ainda usa o fuso do dispositivo até resolver O1 (DST, alteração do fuso e horários locais ambíguos/inexistentes); editor de medições usa horário local do dispositivo. [settings.tsx](<../app/(tabs)/settings.tsx>), [plan.tsx](<../app/(tabs)/plan.tsx>) |
| Média | Exames | Upload não solicita data do exame; usa título/nome do arquivo e timestamp de upload. Não atende data obrigatória nem metadados necessários para prompt. [settings.tsx](<../app/(tabs)/settings.tsx>) |
| Média | Acessibilidade | Componente compartilhado [Input.tsx](../src/ui/components/Input.tsx) mostra rótulos, mas não os associa a `TextInput`; [Button.tsx](../src/ui/components/Button.tsx) não declara papel de botão. Leitores de tela não recebem nomes semânticos consistentes. |
| Média | Layout de treinos | Captura mostra filtros de dia/tipo/ordenação como controles estreitos e muito altos, ocupando grande parte da tela. Filtros ficam difíceis de ler e usar. Ver [Treinos](./e2e-treinos.png); layout definido em [workout.tsx](<../app/(tabs)/workout.tsx>). |

## Cobertura ainda necessária

Requisitos de fotos corporais e comparação mensal; exclusão/recuperação de arquivos de exames; prompts com períodos/anexos corretos; notificações; treino offline e conflito entre dispositivos; isolamento real entre contas; layouts e permissões em Safari/iOS permanecem fora desta execução. Documentação do projeto já registra PWA e recuperação offline como trabalho incompleto. Resultado E2E não certifica esses fluxos nem serviço implantado.
