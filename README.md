# Sistema de Gestão de Estoque

Aplicação React 100% client-side para controle de entrada e saída de materiais, com **Google Sheets como banco de dados**.

Sem backend. Sem servidor. Pode ser hospedado gratuitamente no Vercel, Netlify ou GitHub Pages.

## Como funciona

```
Navegador  ──OAuth 2.0──▶  Google Identity Services
           ──Sheets API──▶  Google Sheets (seus dados)
```

1. O usuário faz login com a própria conta Google (popup OAuth)
2. O app lê e escreve direto na sua planilha via Sheets API v4
3. Nenhum dado passa por servidor externo

## Funcionalidades

- Cadastro de produtos com SKU, categoria, unidade e estoque mínimo
- Registro de **entradas** e **saídas** com histórico completo
- Saldo atualizado automaticamente após cada movimentação
- Alertas visuais de estoque abaixo do mínimo
- Filtros por produto, tipo e data no histórico

## Pré-requisitos

### 1. Projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie um projeto
2. Habilite a **Google Sheets API**
3. Em **Credenciais → Criar → OAuth 2.0 Client ID**, escolha tipo **Aplicativo Web**
4. Adicione em *Origens JavaScript autorizadas*:
   - `http://localhost:5173` (desenvolvimento)
   - Seu domínio de produção (ex: `https://meu-estoque.vercel.app`)
5. Copie o **Client ID** gerado

### 2. Planilha Google Sheets

1. Crie uma planilha em [sheets.google.com](https://sheets.google.com)
2. Copie o **ID** da URL: `docs.google.com/spreadsheets/d/**ID**/edit`
3. Compartilhe a planilha com **qualquer pessoa com o link** pode editar  
   *(ou mantenha restrito — o login Google garante o acesso)*

> O app cria automaticamente as abas **Produtos** e **Movimentações** na primeira vez que conectar.

## Instalação

```bash
# 1. Clonar
git clone <url-do-repo> && cd <pasta>

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
```

Edite o `.env`:

```env
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
VITE_SPREADSHEET_ID=id-da-sua-planilha
```

```bash
# 4. Rodar em desenvolvimento
npm run dev
# → http://localhost:5173

# 5. Build para produção
npm run build
# → dist/  (arquivos estáticos prontos para deploy)
```

## Estrutura do projeto

```
src/
├── api/
│   ├── auth.ts          — OAuth 2.0 via Google Identity Services
│   └── sheets.ts        — CRUD na Sheets API v4 com fetch
├── hooks/
│   └── useEstoque.ts    — Estado global + ações (cadastrar, movimentar)
├── pages/
│   ├── Login.tsx        — Tela de autenticação
│   ├── Dashboard.tsx    — KPIs e alertas de estoque mínimo
│   ├── Produtos.tsx     — Lista com busca e filtro
│   ├── MovimentacaoForm.tsx — Formulário de entrada e saída
│   ├── Historico.tsx    — Log de movimentações com filtros
│   └── NovoProduto.tsx  — Cadastro de produto
├── App.tsx              — Layout com sidebar + roteamento por estado
├── types.ts             — Tipos TypeScript (Produto, Movimentação, Alerta)
└── index.css            — Estilos (tema escuro, sem dependência externa)
```

## Deploy

### Vercel (recomendado)

```bash
npm i -g vercel
vercel
# Adicione as variáveis VITE_GOOGLE_CLIENT_ID e VITE_SPREADSHEET_ID no painel
```

### Netlify

```bash
npm run build
# Arraste a pasta dist/ para app.netlify.com/drop
```

### GitHub Pages

```bash
npm run build
# Suba o conteúdo de dist/ para a branch gh-pages
```

> Lembre-se de adicionar o domínio de produção nas **Origens JavaScript autorizadas** do OAuth Client ID.
