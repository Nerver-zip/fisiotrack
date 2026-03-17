# 🌐 API FisioTrack — Referência de Endpoints

A API é local e utiliza JSON para comunicação. O servidor roda por padrão em `http://localhost:8080`.

## 👥 Pacientes

### 1. Listar Pacientes
`GET /api/patients`
- **Query Params:** `q` (opcional) - Filtra por nome.
- **Resposta:** Lista de objetos `Patient` (contém apenas os dados da última avaliação para o dashboard).

### 2. Detalhes do Paciente
`GET /api/patients/:id`
- **Resposta:** Objeto `Patient` completo, incluindo histórico de `evaluations` e lista de `phone`.

### 3. Criar Paciente
`POST /api/patients`
- **Corpo:** Objeto `Patient`. Pode conter uma lista inicial de `evaluations` e `phone`.
- **Resposta:** `201 Created` com `{"status": "ok"}`.

### 4. Atualizar Paciente (Parcial)
`PUT /api/patients/:id`
- **Corpo:** Objeto JSON contendo apenas os campos que deseja alterar (ex: `{"address": "Nova Rua"}`).
- **Regra:** Realiza um *merge* com os dados existentes. Lista de telefones é substituída se enviada.
- **Resposta:** `200 OK`.

### 5. Importar Pacientes (JSON)
`POST /api/patients/import`
- **Corpo:** Array de objetos `Patient`.
- **Regra de Negócio:** Se múltiplos objetos possuírem o mesmo `name`, suas `evaluations` e `phone` serão mesclados em um único registro.
- **Resposta:** `201 Created` com estatísticas da importação.

### 6. Excluir Paciente
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

### 3. Atualizar Avaliação
`PUT /api/patients/:id/evaluations/:evaluation_id`
- **Corpo:** Objeto `Evaluation` completo ou parcial.
- **Resposta:** `200 OK`.

### 4. Excluir Avaliação
`DELETE /api/patients/:id/evaluations/:evaluation_id`
- **Resposta:** `200 OK` com `{"status": "deleted"}`.
