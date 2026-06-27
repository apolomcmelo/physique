# ARQUITETURA
- Sistema web e mobile, onde algumas funcionalidades dependem dos sensores do celular e da câmera
- Banco de dados para salvar dados, e algum tipo de storage para gravar arquivos como imagens e PDFs
- Typescript para forçar tipagem, e facilitar desenvolvimento web e mobile
- Modelo hexagonal, onde implementações dependem de abstração (Modelo de negócio) e não o contrário

# REQUISITOS DE IMPLEMENTAÇÃO
- TDD
-- Implementar usando o ciclo red-green
- Melhores práticas de UI e UX para clean interface
-- Dê preferência a Dark Mode
- Utilizar apenas tecnologia (bibliotecas, banco de dados) gratuitas
- Clean code
-- Se uma função precisa de comentário pra explicar o que ela faz, então ela deve ser refeita ou renomeada
-- Evitar duplicação
-- Se uma biblioteca já faz algo, utilize-a, não reimplemente

# FUNCIONALIDADES
## Dados do Usuário
- Nome
- Idade
- Altura
- Peso Atual
## Exames
- Upload de análises clínicas e exames
## Fotos
- Upload de fotos
-- Todo dia primeiro do mês deve haver uma notificação indicando que deve tirar 4 fotos do corpo (perfil esquerdo, perfil direito, frente, costas) para comparação de evolução.
-- A notificação deve contiinuar sendo exibida enquanto as fotos para aquele mês não forem enviada
-- A câmera deve exibir na tela um indicador se o celular estiver desnivelado em qualquer eixo. A foto deve ser tirada em modo portrait.
-- Exibir a última foto em dupla exposição para marcar o posicionamento correto
-- Ao salvar foto, registrar valores de acelerômetro, localização, data, e caso o aparelho tenha sensor de luminosidade, o nível de luz também.
-- Ao tirar uma foto, caso exista uma anterior, exibir se a atual está parecida com a anterior, considerando acelerômetro, localização e luminosidade.
## Importação
- Importar CSV para criar plano alimentar e de treino
-- Formato CSV
--- dia;horário;atvidade/refeição;o que fazer/o que comer;foco/motivo
- Importar dados de alimentos
-- OCR por foto para importar ingredientes e tabela nutricional
## Exportação
- Exportar o histórico em formato prompt para LLM gerar plano nutricional e de treinos
-- Incluir as últimas análises clínicas e exames
-- Incluir tabela nutricional e ingredientes dos alimentos utilizados nas refeições
-- Dados do usuário
--- Idade
--- Altura
--- Peso atual
--- Porcentagem de Gordura
--- Porcentagem de Proteínas
--- Objetivo
- Exportar o histórico em formato prompt para LLM rever e atualizar plano nutricional e de treinos, ou encontrar melhorias
-- Incluir as últimas análises clínicas e exames
-- Incluir histórico alimentar
-- Dados do usuário
--- Idade
--- Altura
--- Histórico de Peso
--- Histórico de Porcentagens de Gordura
--- Histórico de Porcentagem de Proteínas
## Dashboard
- Peso atual
- Objetivo (meta de peso)
- Próximo treino
- Próxima refeição
- Lemmbrete: Já bebeu água:
### Exemplo:
Peso Atual: 65kg
Objetivo: 62kg (▼ -3 kg)
Próximo Treino: Em 32 minutos - Calistenia
Próxima refeição: Em 1h - Café da Manhã
Já bebeu água hoje? :)
## Treino
- Registrar Treino
-- Nome
-- Tipo (HIT, Calistenia, Musculação)
-- Quantidade de Séries
-- Repetições por série
-- Carga
No caso de treinamento HIT, não possui carga e série definida, já que acompanho vídeos do youtube.
- A aba de treinos deve exibir uma notificação básica caso o usuário esteja em outra tela, e existe algum treino pra ser iniciado dentro de 15 minutos ou menos.
- Registrar histórico de treino
-- Incluir data, treino, carga utilizada
- Acompanhamento de treino
-- Exibir o treino, indicando qual próximo exercício, qual série atual (1 de 3, por exemplo), quantidade de repetições e carga (Se for utilizada)
-- Ao finalizar uma série (usuário clica em um botão dizendo que terminou a volta):
--- Inicia automaticamente cronômetro para descanso
--- Ao acabar cronômetro, indicador de série atual muda (2 de 3, por exemplo). Caso tenha sido a última série (3 de 3), o sistema mostra o próximo exercício a ser feito.
## Plano do Dia
- Exibir horário, refeição/tipo de exercício e motivo (o que está focado em ajudar)
### Exemplo
| Horário	| Atividade / Refeição	 | O que fazer/O que comer									  |	Objetivo Biológico/Contexto								 |
|-----------|------------------------|------------------------------------------------------------|----------------------------------------------------------|
| 08:30		| Despertar & Hidratação | Beber 1 copo grande de água + 2 Tâmaras Secas ou 1 Banana. |	Açúcar natural para o cérebro; potássio para os músculos.|
| 08:40		| Ativação Matinal		 | Calistenia												  |	Ativação do core, queima de gordura e postura.			 |