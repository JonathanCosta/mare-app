## 🌊 O Conceito "Norte": Fluidez e Calmaria

O aplicativo deve transmitir a sensação de um ambiente calmo e seguro. Evitaremos cantos pontiagudos, contrastes agressivos (como pretos e vermelhos puros) e excesso de linhas divisórias. A navegação deve lembrar o movimento da água: contínua, suave e orgânica.

---

## 🎨 Paleta de Cores (Diretrizes para Tailwind CSS)

Substituiremos o "rosa-choque" e o "vermelho-alerta" comuns nesse nicho por tons que remetem à natureza, praias e oceanos.

| Elemento | Conceito Visual | Código Hex sugerido | Classe Tailwind Custom |
| --- | --- | --- | --- |
| **Fundo Principal** | Areia Clara / Espuma do Mar | `#F8F6F2` | `bg-sand-light` |
| **Texto e Ícones Base** | Profundidade do Oceano (Azul Escuro/Cinza) | `#1E2D38` | `text-ocean-deep` |
| **Dias de Menstruação** | Coral Suave (Rosa queimado / Terracota leve) | `#E08585` | `bg-coral-flow` |
| **Dias de Previsão** | Névoa de Coral (Tom lavado/pastel) | `#F2D1D1` | `bg-coral-mist` |
| **Humor / Destaques** | Verde Água / Aqua Marinha | `#7FA9A4` | `bg-aqua-calm` |

---

## 📐 Diretrizes de UX e Usability (A Experiência Maré)

### 1. Movimentos e Transições (O Efeito Onda)

* **Modais (Bottom Sheets):** Quando o usuário tocar em um dia do calendário, a janela inferior não deve aparecer do nada. Ela deve "subir" suavemente da base da tela, como a maré subindo na areia, usando transições de `transform` e `duration-300`.
* **Troca de Mês (Swipe):** A transição lateral do calendário deve ter um leve efeito de *fade-in-out* e deslize horizontal contínuo.

### 2. Formas e Elementos Visuais

* **Bordas Arredondadas:** Todos os cartões, botões e campos de texto devem usar, no mínimo, `rounded-xl` ou `rounded-2xl`. Nada é quadrado ou rígido.
* **Sombras Orgânicas:** Evitar bordas pretas para separar elementos. Usaremos sombras muito leves (`shadow-sm` adaptada com opacidade baixa) para dar a impressão de que os elementos estão flutuando levemente sobre o fundo "areia".

### 3. O Calendário Minimalista

* **Menos Linhas, Mais Espaço:** O calendário não deve parecer uma tabela do Excel. Ele não terá linhas divisórias entre as semanas ou dias. O que separa os dias é apenas o espaçamento (`gap-2`).
* **Os Indicadores de Diário:** Em vez de entupir o dia com pontos, se o usuário registrou que o humor foi "Irritada", o próprio número do dia ganha uma cor de fundo sutil ou o emoji do humor fica centralizado logo abaixo do número, sem molduras.

### 4. A Onda de Humor (StatsView)

* O gráfico de linhas que mostra as oscilações emocionais deve ser renderizado com a propriedade `tension: 0.4` na biblioteca de gráficos (Chart.js). Isso força a linha a virar uma **curva suave e ondulada**, simulando graficamente o desenho de uma onda/maré subindo e descendo ao longo do mês.

---

## 📱 Fluxo de Interação Detalhado (Exemplo Prático)

> **O Cenário:** O usuário abre o app à noite para registrar o dia.
> 1. Ele abre o app; a tela `HomeView` carrega sem piscar (Offline-first). O cabeçalho diz calmamente: *"Maré calma. Dia 12 do ciclo."*
> 2. No calendário, o dia de hoje está envolvido por um círculo suave de cor verde-água (`bg-aqua-calm`).
> 3. Ele toca no dia de hoje. A tela não muda bruscamente. Uma janela com cantos muito arredondados sobe de baixo.
> 4. Ele clica em "Registrar". O app faz uma transição suave para a tela do Diário.
> 5. Para marcar os sintomas, os botões em formato de pílula acendem com cores suaves quando tocados. Ao digitar a nota e clicar fora, uma pequena onda discreta de carregamento no topo avisa: *"Salvo na sua maré"*.
> 
> 