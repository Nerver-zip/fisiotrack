# 🌐 API FisioTrack — Referência de Endpoints

A API é local e utiliza JSON para comunicação. O servidor roda por padrão em `http://localhost:8080`.

## 👥 Pacientes

### 1. Listar Pacientes
`GET /api/patients`
- **Query Params:** `q` (opcional) - Filtra por nome.
- **Resposta:** Lista de objetos `Patient` (sem detalhamento completo de avaliações por performance).

### 2. Detalhes do Paciente
`GET /api/patients/:id`
- **Resposta:** Objeto `Patient` completo, incluindo histórico de `evaluations` e lista de `phone`.

### 3. Criar Paciente
`POST /api/patients`
- **Corpo:** Objeto `Patient`. Pode conter uma lista inicial de `evaluations` e `phone`.
- **Resposta:** `201 Created` com `{"status": "ok"}`.

### 4. Importar Pacientes (JSON)
`POST /api/patients/import`
- **Corpo:** Array de objetos `Patient`.
- **Regra de Negócio:** Se múltiplos objetos possuírem o mesmo `name`, suas `evaluations` e `phone` serão mesclados em um único registro.
- **Resposta:** `201 Created` com estatísticas da importação (ex: `{"imported": 5, "merged": 2}`).

### 5. Excluir Paciente
`DELETE /api/patients/:id`
- **Resposta:** `200 OK` com `{"status": "deleted"}`.

## 📋 Avaliações

### 1. Adicionar Avaliação
`POST /api/patients/:id/evaluations`
- **Corpo:** Objeto `Evaluation`.
- **Resposta:** `201 Created`.

### 2. Listar Histórico
`GET /api/patients/:id/evaluations`
- **Resposta:** Array de `Evaluation` ordenado por data descendente.
