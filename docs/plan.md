# Plano de Implementação: App de Saúde (Physique)

## 1. Arquitetura e Stack Tecnológico (Proposta Viável e Gratuita)
- **Linguagem Principal:** TypeScript (Front e Back).
- **Frontend (Web e Mobile):** React Native (com Expo). O Expo permite desenvolver para Web, iOS e Android com o mesmo código, além de abstrair perfeitamente o uso de sensores (acelerômetro, câmera, GPS).
- **Backend:** PWA (Progressive Web App) + Supabase (Serviço Gratuito de BaaS). O app rodará 100% no navegador (podendo ser "instalado" no celular/tablet via PWA), se comunicando diretamente com o Supabase via clientes TS. Toda a lógica de negócios residirá na aplicação cliente abstraída arquiteturalmente, sem necessidade de hospedar backend Node.
- **Arquitetura:** Hexagonal (Ports & Adapters) aplicada no frontend. A camada de domínio (regras de negócio) não dependerá de React, Expo ou Supabase, permitindo testes puros e portabilidade.
- **Banco de Dados e Storage:** Supabase (oferece PostgreSQL e Storage de arquivos no Free Tier permanente, lidando com Auth, DB e Storage sem custo de AWS EC2).
- **Testes (TDD):** Jest padrão para unitários (ciclo Red-Green) e React Native Testing Library para componentes.
- **OCR:** Tesseract.js (roda no cliente gratuitamente) ou Free Tier do Google Cloud Vision.

## 2. Padrões de Projeto e Regras de Implementação
- **Desenvolvimento:** Orientado a TDD. Toda funcionalidade de domínio deve ter um teste escrito e falhando antes da implementação.
- **Clean Code:** Funções puras onde possível, nomes descritivos em inglês. Zero comentários explicativos no código de domínio (o nome deve bastar).
- **UI/UX:** Componentes focados em utilidade. Paleta de cores baseada puramente em Dark Mode (contrastes suaves, fundos escuros profundos e fontes legíveis).

---

## 3. Fases de Implementação

### Fase 1: Fundação, Setup e Domínio Core
**Foco:** Preparar o terreno, infraestrutura e as bases da arquitetura hexagonal.
- [ ] Inicializar projeto PWA com Expo Web/React Native.
- [ ] Configuração do Supabase (DB e Storage) no modelo gratuito e setup do client SDK.
- [ ] Setup do framework de testes (Jest) para garantir o TDD desde o dia zero.
- [ ] **Domínio:** Entidades de Usuário (Nome, Idade, Peso, etc.) usando UUIDs genéricos e objetos de valor.
- [ ] **Interface:** Configuração de navegação inicial, suporte PWA e configuração do tema global (Dark Mode).

### Fase 2: Gestão de Dados e Plano Diário
**Foco:** Importação e visualização dos dados cruciais de acompanhamento.
- [ ] Implementar parser de CSV (Backend/Frontend) abstrato (independente de biblioteca).
- [ ] Endpoint de Importação do CSV, mapeando para "Plano Alimentar" e "Plano de Treino".
- [ ] Criação da tela **Plano do Dia**: Timeline limpa baseada no markdown fornecido na especificação (horários, atividades, macros).
- [ ] Dashboard inicial visualizando Peso Atual e Objetivo (cálculos de progresso).

### Fase 3: Dinâmica de Treinos
**Foco:** O motor de lógica de treino e a experiência "durante" o exercício.
- [ ] Domínio de Treino: Registro de Séries, Repetições, Carga e Tipo (HIT, Calistenia).
- [ ] UX do "Treino em Andamento": Interface marcando qual exercício, série atual (ex: 1 de 3) e botões grandes de ação ("Terminei a Série").
- [ ] Uso de cronômetros assíncronos precisos para tempo de descanso (com sons/vibração do Expo persistentes).
- [ ] Integração com sistema para exibição de notificação app-in/push se há treino < 15min.

### Fase 4: Integração Externa e Exportação (Prompt Engineering)
**Foco:** Geração sintática do estado do usuário para processamento por IAs de terceiros.
- [ ] Função pura transversal (Domínio): "Gerador de Prompt". Coleta histórico de peso, análises, treinos e metas e estrutura a string de saída.
- [ ] Exportação do Prompt 1: "Criação de plano focado" para o usuário copiar/enviar ao LLM.
- [ ] Exportação do Prompt 2: "Revisão e melhoria do plano atual".
- [ ] Interface para listar Histórico (refeições e exercícios recentes) que alimentará o prompt.

### Fase 5: Integração de Sensores, Câmera e OCR (Recursos Mobile)
**Foco:** Funcionalidades de tracking corporal e importação inteligente requerendo APIs nativas ou do aparelho.
- [ ] Telas de Upload de Exames (Análises clínicas em PDF/Imagens via Supabase Storage).
- [ ] Módulo Especial Câmera (Uso do `expo-camera` ou `react-native-vision-camera`).
- [ ] Leitura do Acelerômetro (`expo-sensors`) para checar nivelamento de eixos (X, Y) na tela (HUD de nivelamento).
- [ ] UX de Câmera: Dupla exposição carregando de forma semi-transparente a última foto do mesmo ângulo.
- [ ] Coleta de Metadados: Gravar localização (`expo-location`), acelerômetro e luminosidade da foto para validar consistência.
- [ ] Sistema de notificações diárias "Dia 1 do Mês" para bater as 4 fotos para evolução.
- [ ] Integração OCR (ex: Tesseract.js via WebView ou worker thread) para ler rótulos e extrair tabela nutricional.

### Fase 6: Refinamento, Limpeza e Launch
**Foco:** Polimento final garantindo regras de ouro de Clean Code e usabilidade.
- [ ] Auditoria de Clean Code (buscar códigos duplicados na importação/exportação, simplificar states do React).
- [ ] Validação do App rodando liso tanto na Web quanto no Mobile (Android/iOS).
- [ ] Testes de UI/UX em dispositivos físicos.
- [ ] Launch da versão 1.0.
