# Prompt — estatísticas reais do dashboard

Repositório: `/Users/rafaelhenter/workspace/bota-o-shape/bota-o-shape-api`

Implemente estatísticas reais do dashboard administrativo do Bota o Shape, preservando o isolamento por tenant e os padrões Django/DRF existentes.

## Objetivo

Criar um endpoint autenticado e tenant-scoped para substituir os números demonstrativos do dashboard por dados calculados a partir dos modelos existentes.

## Contrato esperado

Adicionar um endpoint somente leitura, seguindo as rotas e permissões já existentes, que retorne:

```json
{
  "active_students": { "value": 0, "change_percent": null },
  "assigned_workouts": { "value": 0, "change_percent": null },
  "pending_assessments": { "value": 0, "change_percent": null },
  "new_students": { "value": 0, "change_percent": null },
  "activity": [
    { "date": "2026-11-01", "workouts_completed": 0, "active_students": 0, "assessments_completed": 0 }
  ]
}
```

## Regras

- Inspecione os modelos de `tenancy`, `workouts` e `assessments` antes de definir cada consulta; não presuma nomes de campos ou status.
- Use o tenant selecionado pelo mecanismo atual (`X-Tenant-ID`/membership) e nunca aceite um tenant arbitrário vindo do corpo ou query string.
- Restrinja o endpoint a owner/admin e aos papéis que já podem visualizar o dashboard.
- `active_students`: memberships ativas com papel de aluno no tenant.
- `assigned_workouts`: atribuições vigentes no período atual, usando os campos reais do modelo.
- `pending_assessments`: avaliações ainda não concluídas/liberadas, conforme o workflow real.
- `new_students`: alunos cuja membership foi criada no intervalo selecionado.
- `change_percent`: compare o intervalo solicitado com o intervalo imediatamente anterior; retorne `null` quando a base anterior for zero.
- `activity`: agregação diária do intervalo, preenchendo dias sem eventos com zero.
- Aceite um intervalo limitado e explícito, por exemplo `days=7|30|90`, com `30` como padrão.
- Evite N+1 e consultas por dia. Prefira agregações ORM com `Count`, filtros e truncamento de data.
- Não crie tabelas de snapshot ou tarefas assíncronas sem evidência de necessidade. Use o cache configurado para dashboard somente se o projeto já tiver um padrão aplicável e invalidação segura por tenant/período.
- Não exponha essas métricas em endpoint público: são dados operacionais da academia. A Home comercial continuará usando uma prévia visual explicitamente demonstrativa.

## Testes obrigatórios

- isolamento entre dois tenants;
- autenticação e autorização por papel;
- contagens para intervalos atual e anterior;
- percentual com base zero;
- estados reais de treino e avaliação;
- preenchimento de dias sem atividade;
- validação de `days` inválido;
- número de queries estável para uma base com múltiplos alunos.

Execute os checks, testes focados e a suíte relevante do projeto. Não altere contratos existentes nem recrie autenticação, tenancy ou modelos de domínio.
