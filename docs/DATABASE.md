# Banco de dados SQLCipher

Uma instalação utiliza um banco criptografado em `database/patients.db`. A senha mestre é a chave do SQLCipher e não é gravada no disco. Durante a execução, apenas um verificador SHA-256 mantido em memória permite abrir sessões adicionais sem reabrir a conexão; ele é apagado quando a última sessão encerra.

## Tabelas

### `patients`

Dados cadastrais, favorito, data da última alteração e identificadores do paciente.

### `patient_phones`

Telefones associados por `patient_id`, removidos em cascata com o paciente.

### `evaluations`

Histórico clínico associado por `patient_id`, incluindo diagnóstico, queixa, antecedentes, exame e plano de tratamento.

### `appointments`

Agenda da clínica, com vínculo opcional ao paciente, data, horário, duração, notas e estado. Agendamentos concluídos compõem a contagem e o histórico de sessões.

### `audit_logs`

Registro de criação, atualização, exclusão, importação, agenda, backup e configuração.

### `cloud_config`

Configuração única e opcional do Google Drive. O refresh token permanece dentro do banco criptografado.

## Integridade e concorrência

- `PRAGMA foreign_keys = ON` protege os relacionamentos.
- `PRAGMA journal_mode = WAL` e timeout de cinco segundos reduzem contenção.
- O servidor serializa as operações autenticadas sobre a conexão compartilhada, evitando que transações de computadores diferentes se intercalem.
- Escritas compostas usam transações para atomicidade.
- O backup usa a API do SQLite para produzir uma cópia consistente.

## Importação de uma instalação existente

Quando o banco principal não existe, o servidor procura um único `.db` dentro de `database/`, ignorando `backups/`. O arquivo e eventuais companheiros `-wal` e `-shm` são copiados; a origem permanece intacta. Com mais de um candidato, a inicialização falha até `DB_MIGRATION_SOURCE` selecionar explicitamente a origem.
