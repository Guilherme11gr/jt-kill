# Análise de Candidatos para Context API

Esta análise identifica áreas da aplicação que se beneficiariam de um gerenciamento de estado global (React Context), baseada na estrutura atual do código.

## 1. UI & Layout Context (`LayoutContext`)

Atualmente, o estado da sidebar móvel (`isSidebarOpen`) está isolado no arquivo `src/app/(dashboard)/layout.tsx`.

*   **Problema Atual:** Componentes profundos (ex: um botão "Voltar" ou ação em uma página interna) não conseguem controlar a visibilidade da sidebar ou de outros elementos de layout.
*   **Por que transformar em Contexto?**
    *   Permitiria que qualquer componente disparasse a abertura/fechamento do menu.
    *   Poderia gerenciar outros estados globais de UI, como "Modo Zen" (esconder sidebar/header), abertura de Command Palette (Cmd+K), ou Drawers globais.
*   **Dados no Contexto:**
    *   `sidebarOpen`: boolean
    *   `setSidebarOpen`: (open: boolean) => void
    *   `toggleSidebar`: () => void
    *   `activeModal`: string | null (para gerenciamento de modais globais)

## 2. Permissões & RBAC (`PermissionsContext`)

O `useAuth` retorna o `profile` que contém o `role` ('OWNER' | 'ADMIN' | 'MEMBER'). Logicas de permissão espalhadas pelos componentes podem se tornar difíceis de manter.

*   **Problema Atual:** Cada botão que requer privilégios (ex: "Deletar Projeto") precisa verificar manualmente `profile?.role === 'ADMIN'`.
*   **Por que transformar em Contexto?**
    *   Centraliza a lógica de permissões. Se a regra mudar (ex: 'MEMBER' pode editar, mas não deletar), muda-se em um só lugar.
    *   Permite um hook mais limpo: `const { can } = usePermissions(); if (can('delete:project')) ...`
*   **Dados no Contexto:**
    *   `can(action: string, resource?: any): boolean`
    *   `role`: UserRole

## 3. Seleção Global de Projeto (`WorkspaceContext` ou `ActiveProjectContext`)

Se a aplicação evoluir para focar em um projeto por vez (estilo Jira, onde você "entra" em um projeto), o ID do projeto atual é um forte candidato.

*   **Cenário:** O usuário seleciona "Projeto A" no dropdown do cabeçalho.
*   **Problema (Sem Contexto):** O ID do projeto precisa ser passado via URL (`/projects/[id]/tasks`) para todas as rotas. Se o usuário estiver na página "Minhas Tarefas" (que é global), ele veria tarefas de todos os projetos, a menos que filtre.
*   **Por que transformar em Contexto?**
    *   Permite "filtragem implícita": `useTasks()` poderia buscar automaticamente apenas tarefas do `activeProjectId` do contexto.
    *   Persistência: Ao recarregar a página, o usuário continua no "contexto" do Projeto A.
*   **Dados no Contexto:**
    *   `activeProjectId`: string | null
    *   `setActiveProject`: (id: string) => void
    *   `currentProject`: Project | null (dados cacheados do projeto ativo)

## Resumo da Recomendação

| Candidato | Complexidade | Impacto | Prioridade |
| :--- | :--- | :--- | :--- |
| **AuthContext** | Média | Alto | ✅ Implementado |
| **LayoutContext** | Baixa | Médio | 🟡 Média |
| **PermissionsContext**| Baixa | Alto (Segurança) | 🟡 Média |
| **WorkspaceContext** | Alta | Alto (UX) | ⚪ Baixa (Depende do Design) |
