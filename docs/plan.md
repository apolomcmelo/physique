# Physique — plano de conclusão e correção

Atualizado em 25/09/2026. Substitui o checklist inicial de construção do zero.

## 1. Referências e estado da revisão

- [Requisitos acordados](requirements-and-functionalities.md): fonte de verdade do produto, incluindo decisões substituídas e fronteiras abertas O1–O6.
- [Treinos e UX](workout-ux-and-responsiveness-plan.md): detalhamento dos incrementos de sessão, recuperação e interface.
- [README](../README.md): entrada do projeto, comandos atuais e limitações do importador.

Objetivo: concluir **todos os grupos funcionais originais** e corrigir bugs introduzidos, preservando melhorias compatíveis. A ordem abaixo é uma proposta técnica baseada em dependências e impacto, não uma redução de escopo.

A revisão funcional original foi estática. Posteriormente, `npm ci`, Jest, TypeScript e exportação web passaram; um teste de políticas/RPCs foi ensaiado em PostgreSQL descartável (detalhes em P0). Dispositivos e serviços implantados continuam não verificados.

Stack declarada em `package.json`: Expo `~52.0.46`, React Native `0.76.9`, React `18.3.1`, TypeScript `^5.3.3`, Supabase JS `^2.45.4`, Jest `^29.7.0` e Tesseract.js `^5.1.0`. Lockfile gerado nesta revisão, ainda sem commit autorizado. O alvo aprovado é web/PWA, não entrega nativa.

## 2. Inventário de implementação e rastreabilidade

**Presente** = estrutura/caminho encontrado; **parcial** = não satisfaz todo o requisito; **bug** = divergência identificada no código; **pendente** = capacidade não encontrada no caminho revisado. Os caminhos abaixo são relativos à raiz e devem ser revalidados antes de editar.

| Requisito | Estado e evidência | Trabalho restante |
|---|---|---|
| BASE: setup, domínio, tema, navegação | Presente: `package.json`, `src/domain/`, `src/ui/theme/`, `app/_layout.tsx`, `app/+html.tsx`. | Validar gate, acessibilidade e alvos web; instalação PWA não demonstrada. |
| BASE/HIS: Google e contas privadas | Parcial: `src/ui/hooks/useAuth.tsx`, `src/infrastructure/supabase/migrations/002_google_auth.sql`, `003_storage_policies.sql`. A política permissiva de `exercises` de `001_initial_schema.sql` não é substituída por 002. | Verificar/corrigir isolamento de exercícios, arquivos e caches. Qualquer Google pode entrar; não construir allowlist. Estado do banco/buckets implantados é desconhecido. |
| ROT/CSV: importação e Plano do Dia | Parcial/bugs: `app/(tabs)/plan.tsx`, `ParseCsvWorkouts.ts`, `ParseCsvMealPlan.ts` em `src/domain/use-cases/`. Há gravações sequenciais, parsing por `split`, descarte silencioso e diferenças local/Supabase. | Contrato único estrito, prévia, ativação por primeira linha, rotina recorrente versionada, gravação recuperável/idempotente. |
| CSV: prescrições | Bugs em `src/domain/use-cases/workout/ParseCsvWorkouts.ts`: `1:20min` isolado não casa; carga seguida de outro parêntese de descanso perde peso; descanso entre segmentos pode ser atribuído ao exercício seguinte. | Regressões com exemplos documentados, validar todos os campos sem fallback permissivo; HIT de uma série com duração definida. |
| TRE: detalhes, edição, ordem e intervalos | Presente/parcial: `WorkoutDetailModal.tsx`, `WorkoutFormModal.tsx`, `Workout.ts`, ambos `*WorkoutRepository.ts` e migration `006_exercise_intervals_and_order.sql`. | Não recriar componentes/006. Verificar comportamento e conectar intervalos ao motor ativo. |
| TRE: execução e histórico | Bugs: `app/workout/active.tsx` oferece Finish ao chegar na última série, antes de registrá-la, e usa descanso manual inicial de 90 s. `FinishWorkoutSession.ts` apenas encerra a sessão. | Última série, valores reais editáveis, default 60 s, parcial/retomar/descartar, histórico detalhado e independente da rotina. |
| TRE/OFF: cronômetros e continuidade | Parcial: `src/ui/hooks/useWorkoutTimer.ts` decrementa callbacks; `src/ui/utils/sound.ts` contém áudio. Recuperação/sincronização de sessão não encontrada. | Tempo decorrido, deadline, cache por conta, outbox/retentativas idempotentes, aviso de conflitos e teste real em navegador. |
| ALI: consumo alimentar | Pendente: `src/domain/entities/MealPlan.ts` modela plano; `app/(tabs)/history.tsx` mostra `getMealPlanEntries()` como histórico. | Registros de consumo real em texto livre, confirmação, substituições, pulos, refeições avulsas e correções. |
| OCR: catálogo e rótulos | Parcial/bugs: `src/adapters/ocr/TesseractOcrAdapter.ts`, `FoodItem.ts`, `app/food/scan.tsx`. Campos limitados; zeros ignorados, dados anteriores retidos, `parseFloat` trunca vírgula e açúcares podem substituir carboidratos. | Tabela arbitrária com unidades/bases, revisão editável, desconhecido distinto de zero, arquivo original e disponibilidade para planejamento. |
| MED: perfil, peso e metas | Parcial: `User.ts`, `WeightRecord.ts`, `SaveUserProfile.ts`, `RecordWeight.ts`, telas Settings/History/Dashboard. Peso do perfil e do histórico divergem. | Fonte única por indicador/data, edições isoladas, múltiplas leituras, metas com baseline datado e estado sem baseline. |
| FOT: captura e consistência | Parcial/bugs: `app/camera/index.tsx`, `useAccelerometer.ts`, `LevelIndicator.tsx`, `ArePhotosConsistent.ts`. Web pula sensores, captura por picker externo à prévia; luminosidade é nula e ausência pode parecer consistência. | Captura web guiada, detecção/permissões, ausência explícita, comparação orientativa, retrato, galeria mensal e principais. |
| EXA: upload e arquivos | Parcial: `app/exams/index.tsx`, `app/(tabs)/settings.tsx`, `Exam.ts`, `SupabaseExamRepository.ts`. Só data de upload; URLs públicas no código; exclusão remove linha, não objeto. | Data do exame obrigatória antes de upload, nome timestamp único, acesso privado/baixar/anexar, exclusão recuperável de arquivo. LocalExamRepository não reidrata datas. |
| LLM: dois prompts e copiar | Presente/parcial: `GenerateNewPlanPrompt.ts`, `GenerateReviewPrompt.ts`, Settings. Exames só têm título/data de upload; faltam ingredientes, tabela inteira, consumo real e detalhes de treino/rotina no review. | Seleção/prévia, dados reais e períodos acordados, nomes exatos dos anexos, contrato comum, instrução explícita de saída em português. |
| LEM: dashboard | Parcial/bugs: `GetNextWorkout.ts` já tem janela e fallback futuro; `GetNextMeal.ts` ignora dia; Dashboard usa duas fontes de peso e hidratação local. | Priorizar sessão ativa, ocorrência/grace, próxima refeição pelo calendário/fuso, meta coerente e reconhecimento diário de água. |
| LEM: notificações | Pendente de integração: hooks `useMonthlyPhotoReminder.ts`/`useWorkoutNotification.ts` não têm chamadores no app revisado; `NotificationService.ts` é orientado a Expo. | In-app funcional e Web Push opcional; deduplicação e opt-ins separados. Foto: diário por uma semana enquanto incompleto. |
| FOT/LEM: mês incompleto | Bug: `ShouldTakeMonthlyPhotos.ts` retorna falso fora do dia 1; teste em `src/domain/__tests__/use-cases/ShouldTakeMonthlyPhotos.test.ts` confirma comportamento conflitante. | Lembrete interno até quatro principais, atualização após upload/exclusão e rollover para mês atual. |
| HIS: retenção e atualização | Bug/risco: `005_cascade_workout_sessions.sql` apaga sessões ao excluir treino; local mantém. Telas carregam principalmente no mount; caches locais têm chaves globais. | Preservar snapshots, exclusão histórica explícita, refresh/invalidação entre telas e isolamento por conta. |

## 3. Forma de executar

1. Resolver somente as fronteiras OPEN que bloqueiam o incremento em questão; registrar a decisão nos requisitos.
2. Reproduzir o bug ou requisito por teste comportamental falhando, na camada apropriada.
3. Fazer a menor alteração coerente com portas/adaptadores existentes e verificar o incremento.
4. Atualizar este inventário com evidência de implementação e verificação. Não marcar concluído só porque o arquivo existe.
5. Fazer mudanças de schema aditivas e migração de dados com ensaio em ambiente de teste; definir rollback/recuperação. Não recriar nem reescrever migration 006 já existente como se fosse nova.

Não é necessário introduzir um servidor Node genérico para tudo. Operações atômicas e envio agendado de Web Push podem precisar de capacidades do backend/serviço; a solução concreta deve respeitar isolamento e custo acordados, sem prometer que todo efeito confiável pode ocorrer no navegador.

## 4. Incrementos propostos

### P0 — Baseline verificável e proteção dos dados existentes

Requisitos: BASE, HIS. Pré-requisito dos incrementos com persistência.

- [x] Estabelecer instalação reproduzível de dependências e executar o gate: `setupFilesAfterEnv` corrigido e coberto por teste; `@types/react-test-renderer` e `query-string` declarados; `package-lock.json` gerado e liberado do `.gitignore` (25/09/2026; ainda não versionado até commit). `npm ci` removeu e reinstalou `node_modules` no repositório com sucesso; domínio: 16 suítes/115 testes; Jest completo: 34 suítes/169 testes; `npx tsc --noEmit` passou; `npx expo export --platform web` exportou 24 rotas estáticas. Reprodutibilidade ainda depende de runtime compatível (verificado com Node 26.3.0/npm 11.16.0); navegadores e serviços implantados não foram verificados.
- [ ] Isolamento: `007_p0_account_isolation.sql` remove `allow_all_exercises`, limita exercícios ao dono do treino e muda buckets `photos`/`exams` para privados; `privateFiles.ts` usa URL assinada para visualização de fotos e referências antigas. Teste com duas identidades em PostgreSQL descartável verificou leitura/gravação de exercícios, arquivos e histórico. **Pendente externo:** inspecionar políticas/buckets realmente implantados, confirmar dois usuários via Supabase Storage/PostgREST e migrar links já compartilhados; URLs públicas antigas deixarão de funcionar.
- [ ] Retenção: `008_p0_history_retention.sql` faz backfill de nomes/prescrições ainda disponíveis e tira cascata da FK sessão→treino, mantendo UUID histórico; snapshots de sessões/séries novas são criados no banco. Teste PostgreSQL conservou série/nomes após apagar modelo; exclusão explícita da sessão remove suas séries. **Pendente:** dados já perdidos em edições antigas não são reconstruíveis; ensaio com cópia real de dados legados e interface de correção/exclusão confirmada permanecem necessários.
- [x] Gravações: RPCs `009`–`011` e adapters fazem criação/edição de treino, importação conjunta e sessão+séries em transações únicas; importação é deduplicada por usuário+conteúdo e erros não deixam refeições/treinos parciais. Teste PostgreSQL injeta falhas no filho, verifica rollback, retry e preservação de IDs. O caminho local agora grava refeições/treinos e identificador de importação em um único snapshot AsyncStorage por conta; testes injetam quota, perda de resposta, retries simultâneos, troca de conta, edição concorrente e reabertura. Prévia/ativação e recorrência/versões da rotina pertencem a P2, não à proteção de gravação P0. A garantia local é por operação na instância do navegador; o browser pode remover dados locais.
- [x] Reidratação de `uploadedAt` em `LocalExamRepository` coberta por teste; `LocalStorage` usa chave por usuário autenticado e ignora chaves globais antigas para não expor registros de outra conta. Dados locais legados são preservados mas ficam inacessíveis até reconciliação segura de propriedade; OFF/P3 tratará limpeza de pendências ao sair da conta. Gate ao final: domínio 16 suítes/115 testes, Jest 40 suítes/199 testes, TypeScript sem erros e export web de 24 rotas; script `scripts/p0-db-check.js` passou duas vezes em PostgreSQL 16.8 descartável. Não houve teste de serviço Supabase real.

Aceite: usuário B não acessa registros/arquivos de A; remover um modelo não elimina histórico realizado; falhas injetadas não deixam rotina ativa pela metade; comandos e resultados do gate registrados.

### P1 — Corrigir execução do treino existente

Requisitos: TRE; detalhamento no plano de treinos.

- [ ] Última série precisa ser registrada antes da conclusão, inclusive um exercício/uma série.
- [ ] Intervalos prescritos usados com default 60 s, herança de transição, zero explícito e ausência de transição final.
- [ ] Valores realmente executados editáveis; HIT como um exercício/uma série com duração definida e tempo realizado.
- [ ] Cronômetros por tempo decorrido e retorno do segundo plano, sem séries/sons fictícios.
- [ ] Sessão parcial e descarte explícito; histórico com nomes, prescrições, cargas e durações, sem depender do modelo atual.

Aceite: teste do fluxo completo, não somente factories; session history contém a última série exatamente uma vez; 20/25/30 min de HIT não viram repetições; atraso de callback não estende artificialmente o cronômetro.

### P2 — Contrato único de CSV, recorrência e versões

Requisitos: ROT, CSV, LLM. Resolver O1–O3 antes das regras afetadas.

- [ ] Formalizar gramática e fixtures compartilhadas entre geração e leitura; parser CSV padrão com aspas/escapes, sem splits ingênuos.
- [ ] Corrigir casos de duração com dois-pontos, peso junto de descanso e descanso standalone no exercício anterior.
- [ ] Validar arquivo inteiro, rejeitar linhas/prescrições inválidas com diagnóstico por linha; remover fallback implícito de treino desconhecido.
- [ ] Modelar rotina semanal, primeira linha como âncora, fuso, versões ativa/pendente e ocorrências independentes.
- [ ] Prévia mostra ativação e substituição; edição só da versão visível; preservar treino em andamento e histórico.
- [ ] Unificar comportamento local/cloud e integrar persistência recuperável de P0; retentativa não duplica rotina.

Aceite: exemplos de terça/quarta/quinta e início passado/futuro no mesmo dia; mudança de semana; regras O1 resolvidas/testadas; importação malformada não altera dados; prompt e importador concordam em todos os exemplos; pending replacement exige confirmação.

### P3 — Recuperação offline limitada a treino

Requisitos: OFF, HIS. Depende de P0/P1 e da identidade de ocorrência de P2; resolver O4.

- [ ] Persistir snapshot da sessão, estado/instantes dos cronômetros e ações pendentes por conta após cada ação significativa.
- [ ] Retomar após refresh/reabertura; sincronizar ao reconectar/reabrir com estados visíveis e retentativa idempotente.
- [ ] Sessão ligada ao dispositivo inicial; preservar sessões concorrentes até resolução explícita.
- [ ] Falha de armazenamento/rede bloqueia novos registros, mantendo instruções/cronômetro; não prometer durabilidade além do navegador.
- [ ] Saída da conta com pendências permite sincronizar, descartar ou cancelar; limpar cache privado ao concluir.

Aceite: série registrada offline sobrevive a reabertura normal; resposta perdida e retry não duplicam série; troca de conta não revela cache; simular quota/falha, autenticação expirada e conflito sem apagar dados.

### P4 — Consumo real, perfil e metas coerentes

Requisitos: ALI, MED, HIS. Usa ocorrências de P2.

- [ ] Registrar confirmação alimentar com snapshot textual e horário, pulos, substituições e refeições avulsas; sem cálculo automático nutricional.
- [ ] Histórico de medições é a fonte de verdade por indicador; backdating, edição/exclusão isolada e múltiplas leituras diárias.
- [ ] Meta com início, alvo e baseline válido; mostrar ausência de baseline sem inventar leitura; preservar metas anteriores.
- [ ] Valores pt-BR corretamente interpretados e validados; refresh entre telas após mudanças.

Aceite: mudar rotina não reescreve consumo; peso novo não apaga percentual antigo; corrigir data X não afeta Y; vírgula decimal preservada; Dashboard/Profile/exports usam os mesmos valores atuais.

### P5 — Tabela nutricional completa e OCR revisável

Requisitos: OCR; dados para LLM.

- [ ] Modelo extensível de linhas/colunas/unidades/bases/valor diário, com imagem/texto original e campo disponível para planejamento.
- [ ] OCR preenche revisão editável, distingue zero/ausente/incerto e não carrega valores do produto anterior.
- [ ] Normalização somente com conversão conhecida; preservar dados originais e identificar calculados.
- [ ] Corrigir açúcar/carboidrato, leitura de colunas, vírgulas e defaults artificiais; migração preserva catálogo atual.
- [ ] Correções de transcrição e novo registro para formulação diferente; todos os alimentos habilitados alimentam prompts.

Aceite: fixtures com vitaminas/minerais, nutrientes desconhecidos, múltiplas colunas, mg/µg/g/ml e valores zero; revisão manual completa o que OCR não leu; sem cálculo de refeições a partir de texto livre.

### P6 — Exames utilizáveis e fotos de progresso no navegador

Requisitos: EXA, FOT, HIS.

- [ ] Exigir data do exame antes de upload; separar data de upload; gerar nome timestamp único e preservar em downloads/prompts.
- [ ] Unificar os fluxos duplicados de exame quando apropriado, oferecer abrir/baixar e recuperação de upload/exclusão parcial de objetos.
- [ ] Captura web na prévia com overlay e fallback manual/upload; retrato e permissões por capacidade.
- [ ] Metadados ausentes distintos de zero, sem consistência falsa; observações em pt-BR com fatores comparados; validar sensibilidade com amostras.
- [ ] Galeria mensal, quatro principais, data de captura confirmada, retakes preservados e comparação do mesmo ângulo entre meses.

Aceite: não há upload de exame sem data; colisão de nome não sobrescreve objeto; download tem nome citado no prompt; falta de sensor/localização não impede foto nem produz confiança falsa; excluir principal atualiza completude.

### P7 — Prompts completos e contrato de ida e volta

Requisitos: LLM, CSV. Depende dos dados de P2/P4/P5/P6; resolver O6.

- [ ] Novo plano e revisão usam perfil/metas e valores atuais consistentes, rotina atual, refeições/treinos reais (30 dias), medições (90 dias), alimentos habilitados e todos os exames dos últimos 12 meses por data do exame.
- [ ] Exibir prévia/períodos, estados parcial/pulado/ausente e lista exata de anexos; instruir anexação manual com mesmo nome.
- [ ] Pedir saída em português e CSV conforme gramática única, inclusive HIT de uma série com duração definida. Sem chamada automática a LLM nem OCR automático de exames.
- [ ] Testes verificam o conteúdo e a importabilidade dos exemplos, não apenas substrings ou snapshots do gerador.

Aceite: nutrientes/ingredientes presentes; nenhuma refeição planejada é descrita como consumida; exame fora de 12 meses não entra por ter upload recente; copiar prompt não afirma que anexou arquivos.

### P8 — Dashboard, PWA e lembretes reais

Requisitos: BASE, LEM, FOT, OFF. Depende do calendário de P2 e dados relevantes; resolver O5.

- [ ] Próximo treino prioriza sessão ativa e grace de 60 min; manter fallback futuro existente. Próxima refeição respeita dia/fuso e rollover.
- [ ] Lembrete de água diário com confirmação, sem tracker de volumes.
- [ ] Integrar lembretes internos: treino em até 15 min em outra tela, dispensa por ocorrência; fotos incompletas do mês atual até quatro principais.
- [ ] PWA instalável opcional e retomada do treino; detectar limites de plataforma sem exigir instalação para recursos básicos.
- [ ] Opt-ins independentes de Web Push; fotos no máximo uma vez por dia por uma semana enquanto incompleto, às 08:00 por padrão no fuso do perfil, com início da janela a confirmar. Não usar cronômetro de página como agendador de push.
- [ ] Definir serviço gratuito de envio/agendamento e ciclo de subscriptions; deduplicar, cancelar somente categoria/ocorrência afetada e testar conclusão/rollover.
- [ ] Testar zoom, leitores de tela, teclado, touch, alturas pequenas e widths 360/390/412/768 px/desktop; revisar `maximum-scale=1` existente.

Aceite: fluxos em Chrome Android, Safari iPhone e desktop Chrome/Edge/Safari; in-app funciona sem push; iPhone informa necessidade de instalação para push; completar fotos interrompe push e lembrete interno; ausência de sensores/som não bloqueia app.

## 5. Gate e entrega

Com dependências instaladas, executar e registrar os resultados, sem supor que os comandos já passam:

```sh
npm run test:domain
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform web
```

- Gate de domínio usa `jest.domain.config.js` e não cobre UI/adaptadores. `npm test` usa a configuração Jest de `package.json`, que precisa do ajuste identificado em P0.
- Não há script de lint declarado no estado revisado. Não inventar um gate existente.
- `npx expo export --platform web` verifica exportação sem chamar o runner de migrations; ainda exige ambiente/dependências adequados e gera `dist/`.
- **`npm run build` executa `npm run migrate` antes da exportação.** Vercel também usa esse script. Ensaio de migration deve ocorrer em banco de teste identificado; não executar como verificação inofensiva.
- Runner atual: `scripts/migrate.js`, arquivos numerados em `src/infrastructure/supabase/migrations/`, controle em `schema_migrations`, transação por arquivo. Um arquivo falhar não reverte migrations anteriores.
- Ensaiar dados legados (ordem/defaults, ownership, snapshots, arquivos, medições, catálogo), recuperação e rollback antes de alterações de schema em uso.
- Atualizar README com setup e limitações reais após cada capacidade entregue. Não afirmar que TDD, build ou navegadores passaram sem resultado registrado.

## 6. Rastreabilidade das fases originais

| Fase original                     | Continuação neste plano                                                          |
|-----------------------------------|----------------------------------------------------------------------------------|
| 1. Fundação, setup e domínio      | P0; suporte PWA e acessibilidade em P8                                           |
| 2. Dados e Plano do Dia           | P2 e P4; Dashboard em P8                                                         |
| 3. Dinâmica de treinos            | P1, P3 e lembretes em P8                                                         |
| 4. Prompts e histórico            | P4, P7 e retenção em P0                                                          |
| 5. Sensores, câmera, exames e OCR | P5, P6 e lembretes em P8                                                         |
| 6. Refinamento e lançamento       | Gate por incremento, matriz web e documentação; nenhum grupo original descartado |
