# API FisioTrack

O backend serve a interface React e a API no mesmo endereço. Na instalação LAN padrão, a base é `http://IP-DO-SERVIDOR:8080`; os exemplos abaixo usam caminhos relativos.

Todas as rotas de dados exigem `Authorization: Bearer <token>`. Somente status, configuração inicial e login são públicos dentro da rede local.

## Autenticação

- `GET /api/auth/status`: retorna `{"initialized": boolean}`.
- `POST /api/auth/setup`: cria o banco na primeira execução. Corpo: `{"password": "..."}`. A senha deve ter oito ou mais caracteres, maiúscula, minúscula e número.
- `POST /api/login`: abre uma sessão. Corpo: `{"password": "..."}`.
- `POST /api/logout`: invalida a sessão atual. O banco fecha quando não resta nenhuma sessão ativa.

## Pacientes

- `GET /api/patients?q=nome`: lista ou busca pacientes.
- `GET /api/patients/export`: retorna os prontuários completos para exportação.
- `GET /api/patients/:id`: retorna um prontuário completo.
- `POST /api/patients`: cadastra um paciente.
- `PUT /api/patients/:id`: atualiza parcialmente um paciente.
- `DELETE /api/patients/:id`: exclui o paciente e seus dados dependentes.
- `POST /api/patients/import`: mescla um array de pacientes pelo nome.

## Avaliações

- `GET /api/patients/:id/evaluations`: lista o histórico clínico.
- `POST /api/patients/:id/evaluations`: adiciona uma avaliação.
- `PUT /api/patients/:id/evaluations/:evaluation_id`: atualiza uma avaliação.
- `DELETE /api/patients/:id/evaluations/:evaluation_id`: exclui uma avaliação.

## Agenda e sessões

- `GET /api/appointments?date=YYYY-MM-DD`: lista o dia selecionado.
- `POST /api/appointments`: cria um agendamento.
- `PUT /api/appointments/:id`: atualiza horário, vínculo, notas ou estado.
- `DELETE /api/appointments/:id`: exclui um agendamento.
- `GET /api/patients/:id/appointments`: retorna o histórico de sessões do paciente.

## Auditoria e backup

- `GET /api/audit`: lista as alterações mais recentes.
- `POST /api/backup`: cria um backup local e, quando configurado, envia a mesma cópia criptografada ao Google Drive.
- `GET /api/backup/config`: lê a configuração sem expor o refresh token.
- `POST /api/backup/config`: atualiza ativação e pasta do Google Drive.
- `GET /api/backup/auth/url`: inicia a autorização OAuth no computador servidor.
- `POST /api/backup/auth/callback`: conclui a autorização OAuth.

## Acesso pela LAN

O build distribuído usa a mesma origem da página e não depende de um endereço externo. O CORS de desenvolvimento aceita apenas loopback ou uma origem cujo host seja o mesmo do backend; origens arbitrárias não recebem permissão.
