# Sugestão de Commit

```bash
git add docs/jira-killer-api.md .github/instructions/copilot-instructions.md scripts/fix-recalc-feature-health.sql
git commit -m "fix(database): corrigir PostgreSQL format() bug em recalc_feature_health

- Substituir format('%.0f%%') por concatenação com || para evitar erro
  'unrecognized format() type specifier'
- Bug causava falha em qualquer updateMany() de tasks
- Aplicar migration diretamente via Prisma

docs(api): adicionar regra de encoding UTF-8 para AI agents
- Documentar uso obrigatório de arquivos JSON temporários
- Preservar emojis e caracteres especiais em markdown
- Atualizar jira-killer-api.md e copilot-instructions.md

Resolves: JKILL-85"
```

## Detalhes

**Problema**: 
Função `recalc_feature_health()` usava `format('%.0f%%')` que causava erro PostgreSQL em algumas condições.

**Solução**:
Concatenação simples: `v_blocked_count || ' of ' || v_total_count || ' tasks blocked (' || round(v_blocked_pct) || '%)'`

**Testes**:
- ✅ Bloqueio via Prisma local
- ✅ Bloqueio via API produção  
- ✅ Health check recalcula corretamente
