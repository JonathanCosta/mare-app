# Dossiê de Arquitetura e Produto: App de Registro de Ciclo Menstrual (PWA)

## 1. Visão Geral e Filosofia do Produto

O aplicativo é um Progressive Web App (PWA) projetado para o acompanhamento diário do ciclo menstrual, sintomas físicos e humor.
A filosofia central do projeto é a **Privacidade Absoluta (Offline-First)**. Dados sensíveis de saúde nunca transitam em servidores de terceiros; todo o armazenamento de histórico e diário ocorre localmente no dispositivo da usuária. O único serviço em nuvem atua como um "despertador cego" para o disparo de notificações push, garantindo total conformidade com LGPD/GDPR e custo zero de infraestrutura na versão inicial.

## 2. Stack Tecnológica Base

* **Front-end:** Vue.js 3 (Composition API) + Vite.
* **Interface (UI):** Tailwind CSS (Mobile-first, padrão *App Shell*).
* **PWA & Service Workers:** `vite-plugin-pwa` para cache estático e instalação nativa.
* **Banco de Dados Local:** IndexedDB, orquestrado pela biblioteca **Dexie.js**.
* **Gráficos:** `vue-chartjs` (ou `ApexCharts`).
* **Microserviço de Notificações (Nuvem):** Cloudflare Workers (Serverless) + Cloudflare D1 (SQLite).

---

## 3. Arquitetura de Interface e UX (Telas)

A navegação será fundamentada em uma **Bottom Navigation Bar** fixa, garantindo acesso rápido com uma mão às 4 seções principais.

### Tela 1: HomeView (O Calendário)

O painel de controle principal para visualização do status.

* **Header:** Mensagem dinâmica de status (Ex: "Dia 14 do Ciclo" ou "Menstruação em 2 dias").
* **Calendário Central:** Grade mensal interativa. Deslizar (swipe) altera os meses.
* **Indicadores Visuais no Calendário:**
* Dias de menstruação registrados: Cor de fundo sólida (ex: rosa/vermelho).
* Dias de menstruação previstos: Contorno tracejado da mesma cor.
* Dia com registro de diário: Exibição do *emoji correspondente ao humor* registrado logo abaixo do número do dia.


* **Interação Primária:** Tocar em um dia abre uma **Bottom Sheet** (modal inferior) com o resumo da data. Esta modal contém o botão de ação "Adicionar/Editar Registro", que direciona para a *LogView*.

### Tela 2: LogView (Diário de Registros)

Focada em inserção de dados em menos de 30 segundos.

* **Header:** Seletor de data (padrão é o dia atual, clicável para dias passados).
* **Inputs Rápidos (Chips/Toggles):** Botões em formato de pílula para dados booleanos (Relação Sexual [Sim/Não], Medicação [Sim/Não]). Um toque alterna o estado e a cor.
* **Seleção de Humor:** Grade de ícones/emojis grandes (Feliz, Irritada, Triste, Disposta, Cansada).
* **Notas:** Campo de texto (textarea) para observações livres.
* **Salvamento:** Gravação reativa no banco local (Dexie.js) a cada interação, com feedback visual discreto (Toast de "Salvo").

### Tela 3: StatsView (Inteligência e Gráficos)

Área para visualização de padrões ao longo do tempo.

* **Gráfico 1 (Regularidade):** Gráfico de barras verticais exibindo a duração total dos últimos ciclos, permitindo visualizar atrasos ou adiantamentos rapidamente.
* **Gráfico 2 (Onda de Humor):** Gráfico de linhas com Eixo X (Dias do Ciclo, ex: 1 a 28) e Eixo Y (Nível de Energia/Humor convertido em valor numérico). Mostra a oscilação hormonal e emocional durante o ciclo.
* **Interação:** Filtros no topo para visualizar "Últimos 3 ciclos" ou "Últimos 6 ciclos".

### Tela 4: SettingsView (Configurações)

Área de controle do sistema e backup.

* **Controles de Ciclo:** Inputs numéricos para ajustar a Duração Média do Ciclo e Duração da Menstruação (afeta a previsão de futuros ciclos).
* **Controle de Push:** *Toggle Switch* para ativar lembretes diários e alertas de aproximação do ciclo (aciona a permissão nativa do navegador).
* **Gestão de Dados (Backup):** Botões para "Exportar Dados" (gera um arquivo `.json` com o dump do Dexie.js) e "Importar Dados" (restaura o backup após troca de aparelho).

---

## 4. Lógica de Previsão e Regras de Negócio

* **Onboarding Inicial:** Ao abrir o app pela primeira vez, uma tela sobreposta solicita a data do 1º dia da última menstruação. O sistema registra o ciclo inaugural e projeta o próximo com base nos valores padrão de configuração (ex: 28 dias).
* **Ajuste Dinâmico:** A partir do terceiro ciclo validado (encerrado pela usuária), o PWA começa a calcular a média móvel dos últimos ciclos para projetar a data do próximo `predicted_next_start`, aumentando a precisão da predição localmente.

---

## 5. Arquitetura do Microserviço de Notificações (Cloudflare)

Devido à natureza PWA e restrições de *background sync* (especialmente no iOS), as notificações ativas exigem um orquestrador externo mínimo.

* **Comportamento:** O aplicativo é "Offline-First", mas as notificações são processadas de forma híbrida.
* **O Worker (index.js):** Um script serverless na Cloudflare recebe e orquestra inscrições de push. Não requer servidor dedicado ou domínio próprio (utiliza subdomínio `.workers.dev`).
* **Banco D1 (SQLite Serverless):** Armazena estritamente a chave criptográfica de envio (Token), sem associação com nome, e-mail ou dados de saúde.
* **Rotina de Disparo (Cron Trigger):**
1. **Lembrete de Diário:** O Worker dispara todos os dias (ex: 20h00) um payload genérico ("*Como você está se sentindo? Atualize seu diário*") para os tokens que habilitaram essa função. O Worker é "cego" e dispara independentemente de a usuária já ter preenchido o app naquele dia.
2. **Lembrete de Ciclo:** O PWA (localmente) calcula a data e envia ao D1 a instrução: *"Acorde este token no dia X"*. O Cron diário da Cloudflare varre o D1, identifica se *Hoje = Dia X* e dispara o alerta (*"Atenção: Seu ciclo se aproxima"*).



---

## 6. Modelagem de Dados Base

### Banco de Dados Local (Dexie.js / IndexedDB) - *Vive apenas no celular*

* **Tabela `user_settings`:** `id` (PK), `average_cycle_length`, `average_period_length`, `push_enabled` (Booleano).
* **Tabela `cycles`:** `id` (PK), `start_date`, `end_date` (Nulo se for o atual), `predicted_next_start`.
* **Tabela `daily_logs`:** `date` (PK), `cycle_id` (FK), `had_sex`, `took_medication`, `mood_id`, `notes`.

### Banco de Dados Nuvem (Cloudflare D1) - *Para orquestração de Push*

* **Tabela `subscribers`:** `id` (PK), `push_endpoint` (URL Google/Apple), `keys_p256dh`, `keys_auth`, `daily_reminder` (Booleano), `next_cycle_alert_date` (Data de disparo específico).
