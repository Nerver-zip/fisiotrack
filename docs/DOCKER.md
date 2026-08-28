# Operação com Docker

O Docker é um modo alternativo de executar o FisioTrack. O container mantém um único processo para a interface e a API; banco, WAL e backups ficam no volume `fisiotrack_data`.

## Pré-requisitos

- Docker Engine com o plugin Docker Compose.
- Porta TCP 8080 liberada no firewall apenas para a sub-rede da clínica.
- `config/client_secrets.json` do tipo aplicativo para computador, caso o Google Drive seja usado.

Nunca execute a instalação nativa e o container sobre o mesmo banco ao mesmo tempo.

## Primeira inicialização

Teste apenas neste computador:

```bash
FISIOTRACK_BIND_ADDRESS=127.0.0.1 docker compose up --detach --build
```

Para atender a LAN, o padrão publica a porta em todas as interfaces do servidor:

```bash
docker compose up --detach --build
```

Acesse `http://IP-DO-SERVIDOR:8080`. Não encaminhe essa porta no roteador.

Com Google Drive:

```bash
docker compose \
  -f compose.yaml \
  -f compose.google-drive.yaml \
  up --detach --build
```

O JSON OAuth é montado como secret somente para leitura e não entra na imagem.

## Operação diária

```bash
# Estado e healthcheck
docker compose ps

# Logs
docker compose logs --follow fisiotrack

# Parar e iniciar preservando os dados
docker compose stop
docker compose start

# Recriar após uma atualização
docker compose up --detach --build

# Remover somente o container e a rede
docker compose down
```

Não use `docker compose down --volumes`: essa opção remove o volume que contém o banco.

## Migrar o banco nativo

Primeiro pare completamente `runlan.sh` e confirme que nenhum processo FisioTrack está ativo. Guarde uma cópia externa de `database/` antes da migração.

Construa a imagem e crie um volume vazio:

```bash
docker compose build
docker volume create fisiotrack_data
```

Copie o banco, WAL, SHM e backups preservando o modo SQLCipher:

```bash
docker run --rm \
  --user 0:0 \
  --entrypoint sh \
  --mount type=bind,source="$PWD/database",target=/source,readonly \
  --mount type=volume,source=fisiotrack_data,target=/target \
  fisiotrack:local \
  -c 'cp -a /source/. /target/ && chown -R 10001:10001 /target'
```

Inicie o container e valide login, pacientes, agenda e histórico antes de remover a origem. Depois de migrar, escolha apenas um modo de execução.

## Backup do volume

O botão de backup cria arquivos SQLCipher em `/app/database/backups`, dentro do mesmo volume. Para uma cópia completa externa, pare o serviço e exporte o volume:

```bash
docker compose stop
mkdir -p docker-backups
chmod 700 docker-backups
docker run --rm \
  --user 0:0 \
  --mount type=volume,source=fisiotrack_data,target=/data,readonly \
  --mount type=bind,source="$PWD/docker-backups",target=/backup \
  ubuntu:24.04 \
  tar -czf /backup/fisiotrack-data.tar.gz -C /data .
sudo chown "$(id -u):$(id -g)" docker-backups/fisiotrack-data.tar.gz
docker compose start
```

Mantenha essa cópia fora do computador servidor. O arquivo continua contendo dados criptografados, mas deve ser tratado como dado clínico.

## Restauração

Pare o serviço, faça um novo backup de segurança e restaure apenas no volume correto:

```bash
docker compose stop
docker run --rm \
  --user 0:0 \
  --mount type=volume,source=fisiotrack_data,target=/data \
  --mount type=bind,source="$PWD/docker-backups",target=/backup,readonly \
  ubuntu:24.04 \
  sh -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + && tar -xzf /backup/fisiotrack-data.tar.gz -C /data && chown -R 10001:10001 /data'
docker compose start
```

A restauração substitui todo o conteúdo do volume. Confira o caminho e a existência do arquivo antes de executar.

## Validação da imagem

O smoke test usa porta, container e volume descartáveis. Ele não toca em `database/` nem no volume `fisiotrack_data`:

```bash
docker build --tag fisiotrack:local .
./scripts/docker_smoke_test.sh fisiotrack:local
```

O teste cobre healthcheck, usuário não-root, filesystem read-only, OAuth sintético, backup local, encerramento gracioso e persistência após recriar o container.
