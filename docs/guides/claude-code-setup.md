# Claude Code + GLM Coding Plan - Setup Guide

## ✅ Instalação Completa

### 1. Claude Code instalado
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Arquivo de configuração criado
**Localização**: `C:\Users\guilh\.claude\settings.json`

## 🔑 Próximo Passo: Obter API Key

Para concluir a configuração, você precisa:

1. **Acessar**: [Z.AI Open Platform](https://z.ai/model-api)
2. **Registrar/Login**: Criar conta ou fazer login
3. **Criar API Key**: Na página [API Keys](https://z.ai/manage-apikey/apikey-list)
4. **Copiar a chave**: Será algo como `sk-xxxxxxxxxxxxx`

## 📝 Configurar API Key

Edite o arquivo `C:\Users\guilh\.claude\settings.json`:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "cole_sua_api_key_aqui",
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air"
  }
}
```

**Substitua** `cole_sua_api_key_aqui` pela sua API Key da Z.AI.

## 🚀 Como Usar

### Iniciar Claude Code no projeto
```bash
cd d:\Users\Guilherme\Documents\development\jt-kill
claude
```

### Verificar status do modelo
Dentro do Claude Code, digite:
```
/status
```

### Dar permissão de acesso
Na primeira execução, Claude Code pedirá permissão para acessar arquivos. Clique em "Yes".

## 📊 Modelos Disponíveis

- **GLM-4.7**: Modelo padrão para Opus e Sonnet (melhor qualidade)
- **GLM-4.5-Air**: Modelo rápido para Haiku (tarefas simples)

## 🔄 Atualizar Claude Code

```bash
claude update
```

## 🐛 Troubleshooting

### Claude Code não inicia
- Feche todos os terminais
- Abra um novo terminal
- Execute `claude` novamente

### Mudanças não surtiram efeito
- Delete `C:\Users\guilh\.claude\settings.json`
- Crie novamente com a configuração correta
- Abra um novo terminal

### Verificar versão
```bash
claude --version
```

## 💡 Benefícios do GLM Coding Plan

- **3× mais tokens** que planos padrão
- **Custo mais baixo** por token
- **Mesma interface** do Claude
- **Desconto**: 50% off + 10-20% extra

## 📚 Links Úteis

- [Z.AI Platform](https://z.ai/model-api)
- [Gerenciar API Keys](https://z.ai/manage-apikey/apikey-list)
- [Assinar Plano](https://z.ai/subscribe)
- [Documentação Completa](https://docs.z.ai)

---

**Status**: ✅ Claude Code instalado | ⏳ API Key pendente
