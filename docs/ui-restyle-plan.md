# Physique — plano de restyle da UI ("Kinetic Obsidian")

Registro da conversa e do plano de alinhamento visual com os mockups HTML (Tailwind, Geist + JetBrains Mono, Material Symbols). Complementa `docs/plan.md` (funcional); este arquivo trata só de UI/UX.

## 1. Regras de trabalho acordadas

- Perguntar em vez de assumir; oferecer 2–3 opções.
- TDD: teste vermelho → verde → refatorar. Aprovação do plano antes de mudanças não triviais.
- Nunca commitar; listar os arquivos alterados.
- Gate de verificação: `npm run test:domain`, `npm test -- --runInBand --silent`, `npx tsc --noEmit`, `npx expo export --platform web --output-dir /tmp/physique-dist`, `npm run test:e2e`. Nunca rodar `npm run build` (executa migrations).
- Se nenhum e2e cobrir a tela, criar o e2e. Os e2e regeneram `docs/e2e-*.png`.
- Cada tela é refeita na ordem em que o usuário envia o mockup.

## 2. Concluído

| Etapa | Resultado |
|---|---|
| Fundação | Tokens (cores, tipografia, espaçamento, raios), fontes Geist/JetBrains Mono, SideNav e abas inferiores. |
| Fuso horário | Removido do perfil; usa o fuso do dispositivo. |
| Dashboard | Refeito conforme mockup. |
| Treinos (lista) | Chips de filtro, busca, grade de cards (`WorkoutCard`, `FilterChip`, `AddSessionCard`), helpers `workoutSummary`. |
| Treinos (edição) | `WorkoutFormModal` + `ExerciseFormCard`: cabeçalho fixo, "Modo Edição", cards de exercício, duplicar, subir/descer. Fora de escopo por decisão: badge de grupo muscular, faixas de reps ("8 - 10"), arrastar e soltar. e2e `edits a workout with the restyled form`. |

## 3. Diagnóstico das demais telas (prioridade)

1. **Treino ativo** (`app/workout/active.tsx`) — em andamento, ver seção 4.
2. **Plano do Dia** (`plan.tsx`): chips de dia em caixa alta mono (diferente dos filtros de Treinos); "Registrar refeição avulsa" é barra cinza full-width; estado vazio com emoji; sem cabeçalho com subtítulo/ação; refeições deveriam virar cards (horário, macros, status).
3. **Histórico** (`history.tsx`): abas em sublinhado simples; "+ Registrar Peso" full-width; sem métricas-resumo/tendência.
4. **Perfil** (`settings.tsx`, 733 linhas): lista longa de botões full-width; sem avatar/cabeçalho de atleta; lápis em emoji. Proposta: duas colunas, cards agrupados (dados, prompts, exames, fotos) e "Sair" em estilo de perigo.
5. **Nutrição** (`nutrition.tsx`): cards com chips de macros e busca; ação de cabeçalho pequena e de baixo contraste.
6. **Login** (`login.tsx`): conteúdo alinhado à esquerda, sem marca. Proposta: card centralizado com logo PHYSIQUE.
7. **Exames, Fotos, Food scan, Camera, WorkoutDetailModal**: verificar tokens e cabeçalho comum (ainda não revisados em detalhe).

### Transversais

- **Largura:** só Dashboard e Treinos limitam o conteúdo (1440). Criar wrapper max-width compartilhado.
- **`PageHeader` compartilhado:** rótulo mono + título + subtítulo + ação.
- **Estados vazios:** trocar emojis por ícones, componente único.
- **Rótulos:** aplicar o estilo mono em caixa alta de forma uniforme.
- **SideNav:** faltam mini-barra de perfil, botão "Iniciar Novo Treino" e status "Sincronizado".

Ordem recomendada: `PageHeader` + wrapper → Treino ativo → Plano → Histórico → Perfil → Nutrição → Login.

## 4. Treino ativo — mockup "Execução de Treino em Tempo Real"

### Problemas atuais
- Anel do timer sobrepõe os dígitos "00:45" (`docs/e2e-wall-sit-timer.png`).
- "← Voltar" empilhado; dois botões primários idênticos e colados; campo de carga vazio e apertado; sem layout largo.

### Elementos do mockup
1. **Barra superior sticky:** "Tempo de Treino: mm:ss" (decorrido), nome do treino, badge "Salvo Localmente", botão "Tela Ativa" (liga/desliga keep-awake).
2. **Cabeçalho do cockpit:** faixa verde à esquerda, badge "Treino em Andamento", "Exercício N de M", nome do exercício, "Progresso: X%" e "Série k de T" (total da sessão) com barra de progresso.
3. **Card "Série Ativa"** (coluna 8/12, borda verde com brilho): "Série N de T", META ("N reps com X kg"), dois steppers grandes (Carga Atual ±1,0 kg; Repetições Feitas ±1) e botão grande "Concluir Série N de T (Iniciar Descanso)".
4. **Card "Descanso"** (âmbar): contagem grande, "restantes", "Padrão: Ns", botões "+30s" e "Pular Descanso", barra de progresso.
5. **"Fila da Sessão"** (coluna 4/12): lista de exercícios com estados Concluído / ATUAL / A seguir / Pendente e resumo por linha.
6. **Layout:** 1 coluna no celular; 2 colunas (8/4) a partir de 1024 px; conteúdo máx. 1440.

### Decisões já tomadas / a confirmar
- Faixas de reps ("8 a 10") **não** são suportadas pelo modelo: META mostra reps únicas. (herdado da decisão do formulário)
- Preservar toda a lógica existente (deadline, retomar, salvar parcial, descartar, corrigir série, timer de série para exercícios por tempo) e os rótulos de acessibilidade usados por `ActiveWorkout.test.tsx` e e2e.
- Escopo escolhido: cockpit completo (barra superior com tempo decorrido, "Salvo Localmente" e toggle "Tela Ativa"; progresso; Série Ativa; Descanso; Fila da Sessão).
- Descanso: manter ±15 s (sem "+30s"), antes e durante o descanso.
- "Salvar parcial" e "Descartar" ficam abaixo da Fila da Sessão; "Voltar" na barra superior abre/foca essas ações. "Finalizar Treino" aparece no card da série ao concluir a última.

## 5. Histórico da conversa (resumo)

1. Análise de requisitos × código e relatório de lacunas.
2. Fundação de UI, remoção de fuso, Dashboard, Treinos e edição de treino refeitos com testes e e2e.
3. Usuário pediu: "Se nenhum e2e cobrir, crie o e2e" → criado e2e de edição.
4. Usuário pediu análise do app inteiro → diagnóstico da seção 3.
5. Usuário enviou o mockup do Treino ativo e pediu: para as demais telas, criar este plano e guardar a conversa.
