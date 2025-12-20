Aqui está a especificação funcional da feature **"Smart Orphan Handling"** (Gestão Inteligente de Órfãos).

Este documento está formatado para você entregar diretamente ao seu Agente (Sonnet 3.5/4.5). Ele descreve a **Lógica de Negócio** e o **Comportamento Esperado**, abstraindo o código, mas dando precisão suficiente para a implementação.

---

# 📋 Feature Spec: Fluxo de Sustentação Automática (Smart Orphans)

**Objetivo:** Permitir que usuários criem Bugs e Tarefas avulsas rapidamente sem burocracia, mantendo a organização rígida do banco de dados (tudo tem um pai).
**Meta de UX:** "Zero Fricção". O usuário não deve pensar "onde guardo isso?" para um bug rápido.

---

## 1. Conceito: O "Container Perpétuo"

Para evitar que tarefas fiquem soltas (órfãs) no sistema, todo Projeto deve nascer com uma estrutura de "Sustentação" padrão.

### 1.1. Regra de Inicialização de Projeto

Sempre que um novo **Projeto** for criado (`ON INSERT projects`), o sistema deve gerar automaticamente e de forma transparente:

1. **Um Épico Fixo:**
* **Título:** `Sustentação & Backlog Geral`
* **Status:** `OPEN` (Indefinidamente)
* **Descrição:** "Container para bugs de produção, débitos técnicos e melhorias que não pertencem a features ativas."


2. **Uma Feature Fixa (Filha do Épico acima):**
* **Título:** `Bugs de Produção & Melhorias`
* **Status:** `TODO`
* **Descrição:** "Tasks órfãs são vinculadas aqui automaticamente."



---

## 2. Fluxo de Criação (User Experience)

### 2.1. O Cenário "Caminho Feliz" (Com Pai Definido)

* **Ação:** Usuário clica em "Nova Task" dentro de uma Feature específica.
* **Comportamento:** O campo "Feature Pai" vem preenchido e travado.
* **Resultado:** A Task é criada vinculada àquela Feature. (Fluxo Padrão).

### 2.2. O Cenário "Caminho Expresso" (Bug/Task Solta)

* **Ação:** Usuário clica em "Novo Bug" ou "Nova Task" na raiz do Projeto ou no Dashboard.
* **Interface:** O campo "Feature Pai" aparece como **Opcional** (ou vazio por padrão).
* **Ação do Usuário:** O usuário digita o título, descrição e **NÃO** seleciona nenhuma Feature pai. Salva o formulário.
* **Lógica do "Magic Link" (Backend):**
1. O sistema detecta que `feature_id` veio nulo/vazio.
2. O sistema busca a Feature Fixa `Bugs de Produção & Melhorias` deste projeto.
3. O sistema força o vínculo da nova task com essa Feature.


* **Feedback:** A task é criada com sucesso. O usuário vê ela no Board/Lista imediatamente.

---

## 3. Visualização e Organização

### 3.1. No Dashboard Pessoal

* Tarefas criadas nesse fluxo aparecem normalmente no Dashboard do dev.
* O "Caminho" (Breadcrumb) mostrado será: `Projeto > Sustentação > Bugs de Produção`.

### 3.2. No Kanban do Projeto

* Quando o gestor filtrar por "Todas as Features", ele verá uma raia (Swimlane) ou grupo chamado **"Bugs de Produção & Melhorias"**.
* Isso facilita a revisão periódica de débitos técnicos.

---

## 4. Regras de Proteção (Business Rules)

1. **Indestrutibilidade:** O Épico e a Feature de Sustentação **não podem ser excluídos** pela UI padrão. Eles são vitais para a integridade do sistema.
2. **Auto-Correção:** Se, por algum motivo (migração de dados, script manual), uma task ficar sem pai no banco, o sistema deve ter um job ou trigger que a mova para a Feature de Sustentação automaticamente.

---

## 5. Instruções para o Agente (Prompt)

> **Tarefa:** Implementar a lógica de "Sustentação Automática".
> 1. **Database Trigger:** Crie uma Trigger no Postgres que, ao inserir um novo `Project`, insira automaticamente o `Epic` de Sustentação e a `Feature` de Bugs.
> 2. **API Logic:** No endpoint de criação de Tasks (`POST /tasks`), adicione uma verificação condicional:
> * Se `feature_id` for fornecido: Use-o.
> * Se `feature_id` for nulo: Busque o ID da Feature "Bugs de Produção" deste projeto e atribua à task antes de salvar.
> 
> 
> 3. **Frontend:** No formulário de criação de Task/Bug global, torne o seletor de Feature opcional. Adicione um "hint" visual: *"Se deixar em branco, será salvo em Bugs de Produção"*.
> 
>