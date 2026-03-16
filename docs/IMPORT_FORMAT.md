# 📄 Formato de Importação JSON

O arquivo de importação deve ser um arquivo `.json` contendo um array de objetos de pacientes.

## 🏗️ Estrutura do JSON

### Exemplo Completo
```json
[
  {
    "name": "João da Silva",
    "healthcare_id": "SUS-999",
    "mom_name": "Maria da Silva",
    "birth_date": "1980-05-20",
    "cpf": "123.456.789-00",
    "gender": "Masculino",
    "address": "Rua Principal, 100, São Paulo, SP",
    "profession": "Engenheiro",
    "phone": ["11999998888", "11888887777"],
    "evaluations": [
      {
        "evaluation_date": "2024-01-10",
        "age": 43,
        "doctor": "Dr. Arnaldo",
        "medical_diagnosis": "Cervicalgia",
        "chief_complaint": "Dor no pescoço há 2 semanas",
        "history_present_illness": "Início após má postura no trabalho.",
        "past_medical_history": "Hipertensão controlada",
        "medications": "Analgésicos",
        "habits_activities": "Trabalha em escritório, sedentário",
        "physical_exam": "Limitação de movimento na flexão cervical",
        "treatment_plan": "Fisioterapia convencional e RPG"
      }
    ]
  }
]
```

## 📚 Dicionário de Dados

### Objeto `Patient`
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `name`| string | **Sim** | Nome completo do paciente. Usado como chave para mesclagem. |
| `healthcare_id` | string | Não | ID do convênio ou SUS. |
| `mom_name` | string | Não | Nome da mãe. |
| `birth_date` | string | Não | Data de nascimento (`YYYY-MM-DD`). |
| `cpf` | string | Não | CPF formatado ou apenas números. |
| `gender` | string | Não | Sexo (ex: "Masculino"). |
| `address` | string | Não | Endereço completo. |
| `profession` | string | Não | Profissão. |
| `phone` | array de strings | Não | Lista de telefones. |
| `evaluations` | array de `Evaluation` | Não | Lista de avaliações clínicas. |

### Objeto `Evaluation`
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `evaluation_date` | string | **Sim** | Data da avaliação (`YYYY-MM-DD`). Essencial para ordenação. |
| `age` | number | Não | Idade do paciente na data da avaliação. |
| `doctor`| string | Não | Médico solicitante. |
| `medical_diagnosis`| string | Não | Diagnóstico médico. |
| `chief_complaint` | string | Não | Queixa principal. |
| `history_present_illness`| string | Não | HDA (História da Doença Atual). |
| `past_medical_history`| string | Não | HPP (História Patológica Pregressa). |
| `medications`| string | Não | Medicamentos em uso. |
| `habits_activities`| string | Não | Atividades e hábitos de vida. |
| `physical_exam`| string | Não | Exame físico e dados de exames complementares. |
| `treatment_plan` | string | Não | Plano de tratamento fisioterapêutico. |

## 🔄 Regras de Mesclagem (Merge)

Se o mesmo `name` de paciente aparecer múltiplas vezes no arquivo:
1. **Dados Cadastrais:** O sistema utilizará os dados do **primeiro** objeto encontrado com aquele nome.
2. **Telefones:** As listas de telefones serão **unificadas** (removendo duplicatas).
3. **Avaliações:** Todas as avaliações de todos os objetos com aquele nome serão **importadas** e vinculadas ao mesmo paciente.
