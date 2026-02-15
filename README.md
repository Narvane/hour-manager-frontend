# Work Hours Dashboard (Frontend)

Interface inicial do dashboard que consome a projeção do backend. **Apenas renderização**: nenhuma regra de cálculo no frontend.

## O que exibe

- **Linha do período**: barra do início ao fim do fechamento com marcador da posição atual
- **Posição atual**: dia X de Y e percentual do período decorrido
- **Resumo geral**: total trabalhado, total ajustado e saldo do período
- **Barras semanais**: distribuição de horas (saldo) por semana natural
- **Termômetro**: andamento do período (0–100% do tempo decorrido)

## Como rodar

1. Backend rodando em **http://localhost:8080** (ex.: `gradle bootRun` no `hour-manager-backend`)
2. Instalar e subir o frontend:

```bash
cd hour-manager-frontend
npm install
npm run dev
```
[Projects.url](../../../AppData/Local/Temp/Projects.url)
3. Abrir **http://localhost:5173**. O Vite faz proxy de `/api` para o backend.

## Build

```bash
npm run build
```

Artefatos em `dist/`. Servir com `npm run preview` ou qualquer servidor estático.

## Stack

- Vue 3 (Composition API)
- TypeScript
- Vite
- Axios (chamada a `/api/v1/dashboard/projection`)

Dados vêm somente da API; a UI não calcula totais, períodos nem progresso.
