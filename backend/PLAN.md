## Objetivo

Substituir o `createReactAgent` por um `StateGraph` com nós explícitos que:

1. **Diagnostica** o problema do veículo
2. **Identifica** o componente que precisa de reparo/troca
3. **Resolve** o part number correto (OEM e aftermarket)
4. **Retorna** links de marketplace com parâmetros de afiliado

### Estado do Grafo

```typescript
interface GraphState {
  messages: BaseMessage[];
  vehicleInfo: {
    year: string;
    make: string;
    model: string;
    trim?: string;
  } | null;
  problemDescription: string | null;
  cacheHit: boolean;
  diagnosis: {
    problem: string;
    cause: string;
    severity: string;
    confidence: number;
  } | null;
  component: {
    name: string;
    category: string;
    system: string;
  } | null;
  partNumber: {
    oem: string;
    aftermarket: string[];
    description: string;
  } | null;
  marketplaceLinks:
    | {
        provider: string;
        url: string;
        price?: string;
        affiliateUrl: string;
      }[]
    | null;
  finalResponse: string | null;
}
```

---

## Steps (Ordem de Estudo e Implementação)

Cada step segue o ciclo: **Leia → Entenda o que precisa estudar → Estude → Aplique → Próximo step.**

---

### Step 1 — StateGraph Fundamentals e State Definition

**O que estudar:** `StateGraph`, `Annotation`, `StateType` do `@langchain/langgraph`

**O que fazer:**

- Criar `src/ai/graph/state.ts` com a interface `GraphState` e o `Annotation` do LangGraph
- Entender como `channels` funcionam (reducers, default values)
- O `messages` usa `messagesStateReducer` (append-only por padrão)

**Conceito-chave:** Cada nó recebe o estado inteiro e retorna um partial update — o LangGraph faz o merge.

**Referência:** https://langchain-ai.github.io/langgraphjs/concepts/low_level/#stategraph

---

### Step 2 — Esqueleto do StateGraph

**O que estudar:** `StateGraph`, `addNode`, `addEdge`, `addConditionalEdges`, `compile`

**O que fazer:**

- Criar `src/ai/graph/index.ts` — instanciar o `StateGraph`, adicionar nós placeholder (retornam estado vazio), compilar
- Refatorar `src/ai/ai.service.ts`: trocar `createReactAgent` por `StateGraph.compile()` com o `MemorySaver` como checkpointer
- Testar que o grafo compila e roda (mesmo sem lógica real nos nós)

**Arquivos a criar/editar:**

- Criar: `src/ai/graph/index.ts`
- Editar: `src/ai/ai.service.ts`

---

### Step 3 — Nó: extractVehicleInfo

**O que estudar:** Structured Output do LLM (`.withStructuredOutput()`), Zod schemas

**O que fazer:**

- Criar `src/ai/graph/nodes/extractVehicleInfo.ts`
- O nó usa o LLM com structured output para extrair `{ year, make, model, trim }` das mensagens
- Se o veículo não estiver completo, o nó retorna uma mensagem pedindo as informações faltantes e o grafo termina (edge condicional para `END`)
- Usar Zod schema para validar a saída

**Lógica:**

```typescript
const vehicleSchema = z.object({
  year: z.string().describe('Ano do veículo'),
  make: z.string().describe('Fabricante'),
  model: z.string().describe('Modelo'),
  trim: z.string().optional().describe('Versão/trim'),
  problemDescription: z.string().describe('Descrição do problema'),
  isComplete: z.boolean().describe('Se temos info suficiente para buscar'),
});
```

---

### Step 4 — Nó: checkCache + Roteamento Condicional

**O que estudar:** Conditional edges no LangGraph, queries semânticas no ChromaDB, scoring de relevância

**O que fazer:**

- Criar `src/ai/graph/nodes/checkCache.ts`
- Corrigir `src/chroma/chroma.service.ts`: o `addDocuments` precisa aceitar `collectionName` (hoje usa `this.collection` que é `undefined`)
- Construir uma query combinando veículo + problema, buscar nas 3 collections
- Definir um **threshold de confiança** (ex: distance < 0.3 no ChromaDB) para decidir se é cache hit
- Adicionar conditional edge: `cacheHit === true` → `formatResponse`, `false` → `diagnoseProblem`

**Bug a corrigir:**

`ChromaService.addDocuments()` usa `this.collection` mas deveria usar `this[collectionName]`. Adicionar parâmetro `collectionName` ao método.

---

### Step 5 — Nó: diagnoseProblem

**O que estudar:** Prompt engineering para diagnóstico automotivo, chain-of-thought

**O que fazer:**

- Criar `src/ai/graph/nodes/diagnoseProblem.ts`
- Usar LLM com um prompt específico de diagnóstico que recebe `vehicleInfo` + `problemDescription`
- Retornar structured output: `{ problem, cause, severity, confidence }`
- O prompt deve instruir o LLM a pensar como um mecânico: sintomas → causas possíveis → causa mais provável

---

### Step 6 — Nó: identifyComponent

**O que estudar:** Taxonomia de componentes automotivos, categorias de sistemas (motor, suspensão, elétrica, etc.)

**O que fazer:**

- Criar `src/ai/graph/nodes/identifyComponent.ts`
- A partir do diagnóstico, identificar o componente específico que precisa ser trocado/reparado
- Retornar: `{ name, category, system }`
- Exemplo: diagnóstico "falha na ignição" → componente "bobina de ignição", sistema "ignição"

---

### Step 7 — Nó: resolvePartNumber

**O que estudar:** Como part numbers funcionam (OEM vs aftermarket), APIs de busca (web scraping com Cheerio/Axios que já estão no projeto)

**O que fazer:**

- Criar `src/ai/graph/nodes/resolvePartNumber.ts`
- **Estratégia em camadas:**
  1. Perguntar ao LLM (GPT-4o-mini conhece muitos part numbers comuns)
  2. Se confiança baixa, buscar na internet (implementar o `search_internet` que hoje é stub)
- Para a busca na internet: usar Axios + Cheerio (já são dependências do projeto) para scraping de catálogos
- Retornar: `{ oem, aftermarket[], description }`

---

### Step 8 — Nó: findMarketplaceLinks

**O que estudar:** Programas de afiliados, construção de URLs com parâmetros de afiliado

**O que fazer:**

- Criar `src/ai/graph/nodes/findMarketplaceLinks.ts`
- Criar `src/ai/graph/config/marketplaces.ts` — configuração genérica de marketplaces:

```typescript
interface MarketplaceConfig {
  name: string;
  searchUrlTemplate: string; // ex: "https://www.amazon.com/s?k={query}"
  affiliateParam: string; // ex: "tag"
  affiliateId: string; // ex: "fixmycar-20"
  enabled: boolean;
}
```

- O nó monta a URL de busca com o part number + nome da peça, adiciona o parâmetro de afiliado
- Estrutura genérica para adicionar qualquer marketplace depois (MercadoLivre, Amazon, eBay, etc.)
- Variáveis de ambiente para affiliate IDs (`AMAZON_AFFILIATE_ID`, etc.)

---

### Step 9 — Nó: cacheResults

**O que estudar:** Estratégias de embedding, deduplicação, metadados no ChromaDB

**O que fazer:**

- Criar `src/ai/graph/nodes/cacheResults.ts`
- Salvar o resultado completo nas 3 collections do ChromaDB:
  - `car-data`: info do veículo + diagnóstico (metadata: year, make, model)
  - `car-problems`: problema + solução (metadata: vehicle key, severity)
  - `car-parts`: peça + part number + links (metadata: component, vehicle key)
- Usar `generateID()` de `src/utils/index.ts` (SHA256) para deduplicação
- Construir o texto do documento de forma que a busca semântica futura encontre matches relevantes

**Fluxo de economia de tokens:**

```
Usuário A: "Meu Civic 2020 está com barulho na suspensão"
→ Cache miss → LLM diagnostica → salva no ChromaDB

Usuário B: "Honda Civic 2020 fazendo barulho embaixo do carro"
→ Cache hit (busca semântica encontra o resultado do Usuário A) → retorna direto
→ Zero tokens de LLM gastos
```

---

### Step 10 — Nó: formatResponse + Integração Final

**O que estudar:** Streaming com LangGraph (`streamEvents`), formatação de resposta

**O que fazer:**

- Criar `src/ai/graph/nodes/formatResponse.ts`
- Montar resposta final estruturada com: diagnóstico, componente, part numbers, links
- Atualizar `src/chat/chat.controller.ts` para streaming (SSE) se desejado
- Atualizar o `SYSTEM_PROMPT` para refletir o novo fluxo
- Testar o fluxo completo end-to-end

---

## Estrutura Final de Arquivos

```
src/ai/
├── ai.module.ts                    (existente, ajustar imports)
├── ai.service.ts                   (refatorar: StateGraph em vez de createReactAgent)
├── system_prompt.ts                (atualizar prompt)
├── tools.ts                        (pode ser removido — lógica move para os nós)
└── graph/
    ├── index.ts                    (definição e compilação do StateGraph)
    ├── state.ts                    (GraphState Annotation)
    ├── config/
    │   └── marketplaces.ts         (configuração de marketplaces)
    └── nodes/
        ├── extractVehicleInfo.ts
        ├── checkCache.ts
        ├── diagnoseProblem.ts
        ├── identifyComponent.ts
        ├── resolvePartNumber.ts
        ├── findMarketplaceLinks.ts
        ├── cacheResults.ts
        └── formatResponse.ts
```

## Bug Existente a Corrigir (Step 4)

Em `ChromaService.addDocuments()`, a linha `this.collection.upsert(...)` deve ser `this[collectionName].upsert(...)` — o `this.collection` nunca é atribuído no `onModuleInit`. Adicionar parâmetro `collectionName` ao método.

## Dependências

Nenhuma nova dependência necessária — o projeto já tem `@langchain/langgraph`, `chromadb`, `axios`, `cheerio`, e `zod`.
