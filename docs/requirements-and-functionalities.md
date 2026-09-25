# Physique — requisitos e funcionalidades

Atualizado em 25/09/2026 após revisão do código e entrevista de produto.

Este documento é a referência do **comportamento acordado**, não uma declaração de que tudo está implementado. O [plano de implementação](plan.md) separa código existente, bugs, funcionalidades parciais e trabalho pendente. O [plano de treinos e UX](workout-ux-and-responsiveness-plan.md) detalha esse recorte sem substituir estes requisitos.

Todos os grupos funcionais originais continuam no escopo. As decisões abaixo substituem escolhas anteriores conflitantes. Os detalhes ainda não resolvidos estão identificados no final; não devem virar decisões implícitas durante a implementação.

## 1. Produto, arquitetura e restrições — BASE

- Uso pessoal inicialmente, depois por familiares e amigos, com contas e dados privados separados.
- Qualquer conta Google pode entrar. O proprietário compartilha o link pessoalmente; isso não é um mecanismo de autorização. Não haverá lista de contas aprovadas nem administração de convites nesta etapa.
- Produto web/PWA, com instalação opcional. Alvos: Chrome Android, Safari iPhone e Chrome, Edge e Safari atuais no desktop. Aplicativos nativos não são alvos de entrega.
- TypeScript, React Native/Expo Web e arquitetura hexagonal: domínio independente de React, Expo, Supabase e APIs de navegador; persistência, relógio e recursos de dispositivo por abstrações/adaptadores.
- Supabase para autenticação, PostgreSQL e arquivos; bibliotecas gratuitas/open-source e serviços gratuitos para o uso pessoal esperado. Sem upgrades pagos automáticos; limites e falhas devem ser visíveis.
- Interface e CSV em português brasileiro; unidades métricas. Valores decimais de entrada devem respeitar pt-BR sem truncar `12,5` para `12`.
- Prompts em inglês, com instrução explícita para o LLM devolver o conteúdo do plano e as recomendações em português.
- Preferência por Dark Mode, legibilidade, acessibilidade e layouts responsivos. Reutilizar os componentes e melhorias de UX compatíveis já existentes.
- TDD para regras de domínio, com ciclo red-green; testes de integração/componentes onde necessários para verificar comportamento. Nomes claros, funções pequenas, evitar duplicação e usar bibliotecas adequadas em vez de reimplementar capacidades disponíveis.
- Configurar um fuso horário no perfil, inicialmente sugerido pelo dispositivo. A rotina usa esse fuso; viagens não o alteram silenciosamente. Preservar o instante e o contexto temporal dos registros históricos.

## 2. Perfil, medições e objetivos — MED

- Perfil: nome, data de nascimento/idade calculada, altura, fuso, objetivo e meta de peso.
- Peso, percentual de gordura e percentual de proteínas têm histórico com data/hora; permitir várias leituras do mesmo indicador no mesmo dia.
- O valor atual de cada indicador é sua leitura mais recente, mostrando sua data. Uma leitura nova apenas de peso não cria nem sobrescreve percentuais.
- Corrigir uma leitura específica afeta somente aquele registro/indicador, não outras datas. Permitir registros retroativos e exclusão confirmada.
- Uma meta tem peso-alvo e data de início. Sua referência é a leitura de peso mais recente na data de início ou antes dela.
- Sem leitura de referência, permitir salvar a meta e mostrar progresso indisponível até o usuário acrescentar ou confirmar uma medição de referência; não usar uma leitura posterior como se fosse anterior.
- Uma nova meta não reescreve metas anteriores. O cálculo de progresso não usa um segundo campo de “peso atual” editável e independente do histórico.

## 3. Rotinas semanais e ocorrências — ROT

- Uma rotina contém refeições e treinos semanais recorrentes, mantidos até substituição.
- Manter uma rotina ativa e, no máximo, uma substituição pendente por usuário. Mostrar claramente a versão visualizada e sua data/hora de início.
- A **primeira linha de dados do CSV** define o ponto inicial semanal. Comparar seu dia da semana e horário com o instante atual no fuso do perfil para encontrar a próxima ocorrência de início.
- Exemplos: início na quarta-feira, importado na terça, começa na quarta seguinte; importado na quinta, começa na quarta da próxima semana. Na quarta às 09:00, início às 10:00 começa hoje; início às 06:00 já passou e começa na próxima quarta.
- Esta regra substitui a proposta de ativar sempre na segunda-feira e a comparação com a primeira atividade da rotina antiga. A igualdade exata entre horário inicial e instante atual ainda está em aberto (O1).
- Aplicar a mesma política temporal às edições. Editar somente a versão visualizada, sem propagar mudanças silenciosamente para outra versão. A identificação do ponto inicial em uma edição e a confirmação após expirar uma prévia precisam ser especificadas (O2).
- Antes de confirmar uma importação/edição, mostrar a ativação calculada e qual versão ativa/pendente será substituída. Preservar histórico e treino em andamento.
- Cada ocorrência é independente: concluída, explicitamente pulada ou sem registro. Não considerar automaticamente uma ocorrência sem registro como pulada, nem movê-la para outro dia. Permitir registro retroativo.
- A troca de rotina não apaga refeições consumidas ou sessões realizadas. Registros históricos preservam nomes, prescrições e valores relevantes na época, independentemente de alterações/exclusões do modelo da rotina.

## 4. CSV e geração de rotina — CSV

- Importar um único CSV para criar a rotina alimentar e de treinos, com o cabeçalho:

  ```text
  dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo
  ```

- CSV padrão separado por ponto e vírgula, incluindo campos entre aspas, delimitadores dentro de campos e escapes de aspas. `dia` representa dia da semana em português; `horário`, um horário inicial `HH:MM`.
- Tipos de treino: `Calistenia`, `Musculação` e `HIT`. Refeições têm nome e descrição livre; a descrição alimentar não é convertida em cálculo nutricional.
- O contrato de geração do prompt e o de importação devem ser **o mesmo**. Consolidar e testar uma gramática única, em vez de instruções divergentes em dois geradores e dois parsers.
- Prescrições devem representar ordem, séries, repetições ou duração, carga quando aplicável, descanso entre séries e transição. Manter as formas compatíveis documentadas no README, corrigindo os bugs conhecidos; formalizar os limites restantes em O3.
- HIT acompanhado por vídeo é **um exercício, uma série, duração definida**, normalmente 20–30 minutos, sem inventar repetições ou carga. Exemplo de prescrição: `1x 25min Treino HIT`. Não aceitar uma descrição vaga de duração como substituta da prescrição exigida.
- Validar o arquivo inteiro, incluindo prescrições, com erros por linha. Uma prescrição desconhecida/malformada torna a importação inválida: não existe opção de “aceitar como texto livre”. Texto livre continua permitido onde faz parte do contrato, como descrição de refeição e nome de exercício.
- Apresentar prévia completa antes de gravar: refeições, treinos, prescrições, ordem, versão afetada e ativação. Não salvar somente as linhas válidas nem ignorar exercícios silenciosamente.
- Importação inválida ou gravação malsucedida não pode deixar a rotina ativa parcialmente alterada. Retentativas não podem duplicar uma importação.

## 5. Treinos, sessões e descanso — TRE

- Cadastro/edição: nome, tipo, agenda, exercícios ordenados, séries, repetições/duração, carga, intervalos e observações.
- Manter inspeção de detalhes antes de iniciar, modal de edição com rolagem própria, controles de reordenação e ações acessíveis. Filtros por dia/tipo e ordenação devem continuar disponíveis.
- Durante a sessão, mostrar exercício atual/próximo, série atual/total e prescrição. Preencher os valores com o planejado, permitindo registrar repetições, carga e duração realmente executadas.
- “Terminei a série” registra os valores visíveis e inicia o descanso. Registrar a última série **antes** de oferecer conclusão do treino; vale também para treino de um exercício/uma série.
- Série cronometrada concluída registra sua duração. Permitir término antecipado e correção posterior. HIT usa uma única série cronometrada e guarda tempo realizado, não repetições/carga fictícias.
- Descanso entre séries: valor do exercício; se ausente, **60 segundos**.
- Transição: valor explícito de transição; se ausente, herdar descanso entre séries; se ambos ausentes, **60 segundos**.
- Zero significa sem descanso, nunca ausência. Não iniciar descanso de transição após o último exercício.
- Valores de descanso ficam visíveis e editáveis. Ajustes na sessão não reescrevem a rotina. Permitir pular descanso.
- Cronômetros usam tempo decorrido/instantes de término, não contagem de callbacks. Sons nos últimos cinco segundos e na conclusão, quando o navegador permitir; não garantir som em tela bloqueada.
- Ao voltar do segundo plano, concluir somente o cronômetro que estava rodando. Se uma série expirou, calcular descanso a partir do término dessa série; mostrar descanso restante ou concluído. Não iniciar/registrar a próxima série automaticamente nem reproduzir sons atrasados.
- Oferecer manter a tela acordada enquanto a sessão estiver visível, quando suportado.
- Interrupção: Retomar, Salvar como parcial ou Descartar. Sessão parcial conserva séries e tempo efetivamente registrados, identificados como incompletos. Descartar exige confirmação.
- Histórico inclui data, treino/exercícios, prescrições, repetições, cargas/durações reais e estado completo/parcial. Permitir correções e registros retroativos.

## 6. Continuidade offline de treino — OFF

- Um treino já carregado deve continuar sem rede e guardar progresso local após cada ação significativa. Retomar após atualizar/reabrir a aplicação.
- Mostrar a diferença entre salvo neste dispositivo, pendente de sincronização e sincronizado. Sincronizar ao reconectar/reabrir; não depender exclusivamente de Background Sync.
- Se nem armazenamento local nem sincronização funcionarem, manter instruções e cronômetro utilizáveis, mas bloquear novos registros com aviso claro. Não afirmar que uma alteração apenas em memória está salva.
- A sessão permanece no dispositivo onde começou. Outros dispositivos mostram aviso quando souberem da sessão ativa.
- Se duas sessões offline competirem pela mesma ocorrência, preservar ambas e sinalizar o conflito para decisão do usuário, sem mesclar séries nem sobrescrever silenciosamente. Retentativas devem ser idempotentes.
- Antes de sair da conta com alterações pendentes, oferecer sincronizar primeiro ou descartar explicitamente; permitir cancelar a saída. Após sair, limpar caches privados de treino. Nenhuma conta pode acessar o cache de outra.
- A garantia é limitada pelo navegador: dados locais podem ser removidos pelo usuário, navegação privada ou política de armazenamento. Não prometer durabilidade absoluta.
- Esta decisão cobre continuidade de treino já carregado; edição offline geral de todos os módulos não foi aprovada.

## 7. Plano alimentar e consumo real — ALI

- Plano do Dia exibe horário, atividade/refeição, descrição e objetivo/contexto.
- Refeições permanecem descrições simples em texto livre. Não implementar vínculo obrigatório com alimentos do catálogo, cálculo automático de refeições ou inferência de consumo a partir do plano.
- Um toque confirma “comi conforme planejado”, com data/hora atual preenchida. Copiar a descrição planejada para um registro histórico independente.
- Permitir corrigir descrição e horário, registrar substituições/notas e refeições não planejadas pelo mesmo formulário simples. Registrar refeição pulada explicitamente; ausência de registro não significa consumo nem pulo.
- Histórico alimentar é consumo real, não a lista da rotina. Editar a rotina depois não altera o texto já registrado.
- Permitir correções, registros retroativos e exclusões confirmadas.

## 8. Alimentos e OCR — OCR

- Catálogo estruturado com nome, marca/fonte, ingredientes e **tabela nutricional inteira**, não apenas calorias e macronutrientes. Incluir vitaminas, minerais, enriquecimentos e quaisquer nutrientes presentes.
- Preservar cada linha, nome original, unidade, valores, base de cada coluna (por porção, 100 g/ml etc.) e percentual de valor diário quando informado. Não limitar nutrientes a uma lista fixa.
- Derivar valores normalizados somente quando base e conversão forem conhecidas; identificar valores calculados. Não converter volume em massa sem conversão conhecida.
- Capturar rótulo por imagem/OCR, preservar imagem original e texto reconhecido, e oferecer revisão editável antes de salvar. O usuário pode completar campos ausentes e corrigir erros de leitura.
- Permitir salvar registros explicitamente incompletos após revisão, destacando valores desconhecidos/incertos. Zero é valor, não ausência; não preencher silenciosamente macros desconhecidos com zero nem porção desconhecida com 100 g.
- Nova leitura não pode misturar valores remanescentes de um produto anterior. Açúcares não substituem carboidratos totais.
- Cada alimento tem “disponível para planejamento”, habilitado por padrão. Prompts usam os dados estruturados de **todos os alimentos habilitados**, inclusive nutrientes e ingredientes, para o LLM criar a rotina.
- A aplicação não calcula a nutrição de refeições a partir desse catálogo. Descrições livres não determinam quais produtos foram consumidos.
- Corrigir erros de transcrição no próprio registro. Uma formulação/produto materialmente diferente ganha outro registro. Alterar o catálogo não reescreve refeições históricas.

## 9. Fotos corporais — FOT

- Captura/upload em retrato para frente, costas, perfil esquerdo e perfil direito. Confirmar data de captura; usar essa data, não a data de upload, para definir o mês.
- Galeria mensal com os quatro ângulos e comparação lado a lado do mesmo ângulo entre dois meses.
- Preservar fotos salvas e permitir escolher uma principal por mês/ângulo. Uma nova foto pode mudar a escolha principal sem excluir a anterior silenciosamente.
- Um mês está completo quando há quatro seleções principais. Exclusão de uma principal deve oferecer outra seleção; sem substituta, o ângulo fica incompleto.
- Na captura, mostrar a foto anterior do mesmo ângulo semitransparente para posicionamento e orientação de nivelamento nos eixos que possam ser medidos. A captura deve corresponder à prévia guiada quando disponível.
- Solicitar permissões/capacidades suportadas; guardar orientação/aceleração, localização, data e luminosidade quando disponíveis. Falta de suporte/permissão não impede fotografia: oferecer orientação manual e registrar ausências como ausências, não zeros.
- Consistência automática compara somente condições de captura disponíveis, não reconhece posição corporal nem avalia evolução física.
- Exibir observações individuais/diferenças e fatores ausentes. Resultado geral: condições semelhantes, diferenças detectadas ou dados insuficientes. Não declarar consistência só porque faltam sensores. Feedback é orientativo e não bloqueia salvamento.
- Limiares devem ser calibrados/validados com casos representativos; números existentes não são automaticamente critérios aprovados.

## 10. Exames e arquivos — EXA

- Upload de análises clínicas/exames em PDF ou imagem, com título, **data do exame obrigatória antes do upload** e notas opcionais. Guardar separadamente o timestamp de upload.
- No upload, acrescentar timestamp ao nome do arquivo e garantir unicidade em colisões. Usar o mesmo nome atribuído nos downloads e nas referências do prompt, mesmo após corrigir título/data.
- Permitir localizar/abrir/baixar os arquivos para anexação manual ao LLM. Copiar o prompt não anexa arquivos.
- Prompts referenciam nome exato do arquivo, data do exame e notas. O usuário deve anexar os arquivos **com os mesmos nomes** citados.
- Incluir por padrão todos os exames dos últimos **12 meses**, filtrados pela data do exame. A janela exata de fronteira está em O6. Exames mais antigos podem permanecer armazenados; a regra de exportação não os exclui do arquivo pessoal.
- Permitir corrigir metadados e excluir registros com confirmação. Exclusão de foto/exame remove também o arquivo associado; falha parcial deve ficar visível e ser recuperável.
- Contas separadas têm acesso privado aos seus arquivos; não depender de links públicos como substituto de autorização.

## 11. Exportação manual para LLM — LLM

- Dois fluxos: gerar novo plano e revisar/melhorar o plano atual. Preparar e revisar prompt, copiar, usar o LLM escolhido externamente e importar o CSV devolvido. Não chamar LLM automaticamente.
- Prompt em inglês, solicitando CSV e recomendações em português, conforme contrato CSV único e validado pelo importador.
- Prévia permite revisar conteúdo e períodos. Padrões: perfil/objetivos atuais, rotina atual, últimos 30 dias de refeições e treinos reais, últimos 90 dias de medições, todos os alimentos habilitados para planejamento e todos os exames dos últimos 12 meses.
- A decisão sobre alimentos substitui “inferir alimentos usados nas refeições”. A decisão de 12 meses substitui janelas de dois anos ou seleção obrigatoriamente vazia de exames.
- Incluir histórico de peso/gordura/proteínas com datas e valores atuais de cada indicador, detalhes de treino/cargas/durações e consumo real.
- Distinguir sessão parcial/completa, planejado/realizado, pulado/sem registro e valores ausentes. Permitir exportar com categorias sem dados, identificadas claramente.
- Mostrar lista de anexos com nomes exatos dos exames incluídos e instrução de anexação manual. O prompt não contém resultados extraídos automaticamente dos PDFs/imagens.
- Ambos os geradores usam as mesmas regras alimentares, temporais e de prescrição; validar seus exemplos contra o mesmo contrato do importador.

## 12. Dashboard e lembretes — LEM

- Exibir peso atual, meta/progresso, próximo treino, próxima refeição e lembrete de água.
- Treino em andamento tem prioridade. Caso contrário, manter treino ainda não concluído visível por até 60 minutos após o agendamento. Preservar a informação do próximo agendamento fora da janela, sem esconder treinos futuros.
- Próxima refeição respeita dia e horário no fuso do perfil, incluindo o dia seguinte quando não houver mais refeições hoje.
- Hidratação: lembrete diário gentil e dispensável, com “Já bebi água”. Não é controle de volumes nem uma meta de ingestão.
- Lembretes internos são a base: avisar treino a iniciar em até 15 minutos enquanto o usuário está em outra tela; lembrar dispensa por ocorrência.
- Fotos: a partir do início do mês, manter lembrete interno dos ângulos faltantes até completar o mês. Ao mudar de mês, focar o mês atual; meses antigos incompletos permanecem na galeria.
- Web Push é opcional, com opt-ins separados para treinos e fotos. Explicar instalação/permissões necessárias, sem bloquear outros recursos.
- **Push de fotos: uma vez por dia durante uma semana, às 08:00 por padrão no fuso do perfil**, enquanto o mês estiver incompleto; parar quando as quatro principais estiverem presentes. O início exato da semana ainda precisa de confirmação (O5). O lembrete interno continua depois dessa semana enquanto necessário.
- Não garantir entrega pontual de push ou som com tela bloqueada. Deduplicar notificações e não cancelar lembretes de outra categoria ao atualizar fotos.

## 13. Histórico, exclusão e isolamento — HIS

- Permitir correções, registros retroativos e exclusões dos próprios registros com confirmação identificando o registro e as consequências.
- Excluir rotina/modelo não exclui histórico realizado. Preservar snapshots/contexto necessário para entender registros antigos.
- Exclusão histórica explícita é permanente; arquivos associados a fotos/exames também devem ser removidos, com recuperação de falhas parciais.
- Persistência e caches devem respeitar isolamento por conta. Atualizações precisam refletir nas outras telas sem depender de fechar/reabrir a aplicação.

## 14. Fronteiras ainda abertas — OPEN

Esses pontos não impedem documentar o acordo, mas devem ser resolvidos antes do incremento afetado:

| ID | Decisão pendente | Trabalho afetado |
|---|---|---|
| O1 | Ativação no instante exatamente igual ao início; resolução de horário inexistente/duplicado em mudança de horário de verão; efeito de mudar fuso sobre agenda futura. | ROT, LEM |
| O2 | Ponto inicial preservado/recalculado em edição; mapeamento das outras linhas no ciclo ancorado na primeira; corte preciso entre versões e revalidação quando a prévia expira. | ROT, CSV |
| O3 | Formalizar gramática completa: limites numéricos, campos vazios, aliases, faixas/alternativas, unidade/precisão e rejeição de atividades ambíguas. HIT já está resolvido como uma série de duração definida. | CSV, TRE, LLM |
| O4 | Ações de resolução de duas sessões concorrentes e tratamento de conflito com exclusão/correção feita em outro dispositivo. Preservar ambas até decisão já está acordado. | OFF, HIS |
| O5 | Push de fotos: semana começa no dia 1 ou no opt-in? Horário padrão já definido: 08:00 no fuso do perfil. Treinos: frequência de push e política de atraso/reagendamento/dispensa. Persistência entre dispositivos da confirmação de água. | LEM |
| O6 | Fronteiras inclusivas e relógio de referência dos últimos 12 meses, 30 dias e 90 dias; limites de tamanho do prompt e mensagens ao atingir limites gratuitos. | EXA, LLM, BASE |

## 15. Limites de plataforma documentados

- [Web Push no iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): depende de app adicionado à tela inicial e permissão por interação do usuário.
- [Visibilidade de página](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API): cronômetros em segundo plano podem ser limitados/suspensos.
- [AmbientLightSensor](https://developer.mozilla.org/en-US/docs/Web/API/AmbientLightSensor): suporte limitado; não é pré-requisito de fotografia.
- [Armazenamento do navegador](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria): persistência local não é absoluta.
- [Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API): suporte limitado; sincronização ao reabrir é necessária como caminho compatível.
