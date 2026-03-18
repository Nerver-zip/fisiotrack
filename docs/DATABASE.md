# 🗄️ Documentação do Banco de Dados (SQLite + SQLCipher)

O sistema utiliza um banco de dados relacional criptografado para armazenar dados cadastrais e clínicos.

## 📌 Esquema de Tabelas

### 1. `patients` (Dados Cadastrais)
Armazena as informações básicas e imutáveis (ou raramente alteradas) do paciente.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | INTEGER | Chave primária (Autoincrement) |
| `healthcare_id` | TEXT | ID do Convênio |
| `name` | TEXT | Nome completo do paciente (Obrigatório) |
| `mom_name` | TEXT | Nome da mãe |
| `birth_date` | TEXT | Data de nascimento (YYYY-MM-DD) |
| `cpf` | TEXT | CPF formatado ou apenas números |
| `gender` | TEXT | Sexo (Masculino, Feminino, Outro) |
| `address` | TEXT | Endereço completo |
| `profession` | TEXT | Profissão atual |

### 2. `patient_phones` (Telefones)
Relacionamento N:1 com a tabela `patients`.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | INTEGER | Chave primária |
| `patient_id` | INTEGER | FK para `patients(id)` (CASCADE DELETE) |
| `phone` | TEXT | Número de telefone |

### 3. `evaluations` (Histórico Clínico)
Armazena as entradas clínicas (fichas de avaliação) ao longo do tempo. Relacionamento N:1 com `patients`.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | INTEGER | Chave primária |
| `patient_id` | INTEGER | FK para `patients(id)` (CASCADE DELETE) |
| `evaluation_date` | TEXT | Data da avaliação (YYYY-MM-DD) |
| `age` | INTEGER | Idade do paciente na data da avaliação |
| `doctor` | TEXT | Médico solicitante |
| `medical_diagnosis` | TEXT | Diagnóstico médico |
| `chief_complaint` | TEXT | Queixa principal |
| `history_present_illness`| TEXT | HDA (História da Doença Atual) |
| `past_medical_history` | TEXT | HPP (História Patológica Pregressa) |
| `medications` | TEXT | Medicamentos em uso |
| `habits_activities` | TEXT | Atividades e hábitos |
| `physical_exam` | TEXT | Exame físico / complementares |
| `treatment_plan` | TEXT | Plano de tratamento |

## 🔒 Segurança
- **Criptografia:** SQLCipher com AES-256.
- **Integridade:** `PRAGMA foreign_keys = ON` ativado em todas as sessões.
- **Transações:** Operações de escrita complexas (como `add_patient`) utilizam `BEGIN TRANSACTION` para garantir atomicidade.
