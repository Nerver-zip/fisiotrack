import sys
import os
import argparse
import socket
import time
import httplib2
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_httplib2 import AuthorizedHttp
from googleapiclient.errors import HttpError
import json

# Configurações
SCOPES = ['https://www.googleapis.com/auth/drive.file']
REQUEST_TIMEOUT_SECONDS = int(os.getenv('GDRIVE_TIMEOUT_SECONDS', '60'))
MAX_RETRIES = int(os.getenv('GDRIVE_UPLOAD_RETRIES', '3'))

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DEFAULT_CLIENT_SECRETS = os.path.join(PROJECT_ROOT, 'config', 'client_secrets.json')

def get_gdrive_service(args):
    client_id = args.client_id
    client_secret = args.client_secret

    if (not client_id or not client_secret) and os.path.exists(DEFAULT_CLIENT_SECRETS):
        with open(DEFAULT_CLIENT_SECRETS, 'r', encoding='utf-8') as secrets_file:
            data = json.load(secrets_file)
            installed = data.get('installed', {})
            client_id = installed.get('client_id')
            client_secret = installed.get('client_secret')

    if not args.refresh_token or not client_id or not client_secret:
        raise RuntimeError("Credenciais OAuth da instalação não estão completas.")

    creds = Credentials(
        token=None,
        refresh_token=args.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES
    )
    creds.refresh(Request())

    authed_http = AuthorizedHttp(creds, http=httplib2.Http(timeout=REQUEST_TIMEOUT_SECONDS))
    return build('drive', 'v3', http=authed_http, cache_discovery=False)

def execute_with_retry(request_factory, description):
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return request_factory().execute()
        except (socket.timeout, TimeoutError, OSError, httplib2.ServerNotFoundError) as exc:
            last_error = exc
        except HttpError as exc:
            status = getattr(exc.resp, 'status', None)
            if status in {408, 429, 500, 502, 503, 504}:
                last_error = exc
            else:
                raise
        if attempt < MAX_RETRIES:
            time.sleep(attempt)
    raise RuntimeError(f"{description} falhou apos {MAX_RETRIES} tentativas: {last_error}")

def upload_to_gdrive(args):
    file_path = args.file
    filename = args.filename
    parent_id = args.folder_id

    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Arquivo de backup nao encontrado: {file_path}")

        service = get_gdrive_service(args)

        # Verificar se arquivo existe
        query = f"name = '{filename}' and trashed = false"
        if parent_id:
            query += f" and '{parent_id}' in parents"

        results = execute_with_retry(
            lambda: service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)',
                includeItemsFromAllDrives=True,
                supportsAllDrives=True
            ),
            "Consulta no Google Drive"
        )
        files = results.get('files', [])

        media = MediaFileUpload(
            file_path,
            mimetype='application/octet-stream',
            resumable=True,
            chunksize=1024 * 1024
        )

        if files:
            file_id = files[0]['id']
            execute_with_retry(
                lambda: service.files().update(
                    fileId=file_id,
                    media_body=media,
                    supportsAllDrives=True
                ),
                "Atualizacao do arquivo no Google Drive"
            )
            print(f"✅ Backup atualizado no GDrive! ID: {file_id}")
        else:
            file_metadata = {'name': filename}
            if parent_id:
                file_metadata['parents'] = [parent_id]
            new_file = execute_with_retry(
                lambda: service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id',
                    supportsAllDrives=True
                ),
                "Criacao do arquivo no Google Drive"
            )
            print(f"✅ Novo backup criado no GDrive! ID: {new_file.get('id')}")
        
        return True
    except Exception as e:
        print(f"❌ Erro no upload: {type(e).__name__}: {str(e)}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Upload do backup da clínica para o Google Drive')
    parser.add_argument('file', help='Caminho para o arquivo local')
    parser.add_argument('filename', help='Nome do arquivo no Google Drive')
    parser.add_argument('--refresh_token', help='Google OAuth2 Refresh Token')
    parser.add_argument('--folder_id', help='Google Drive Folder ID')
    parser.add_argument('--client_id', help='Google OAuth2 Client ID')
    parser.add_argument('--client_secret', help='Google OAuth2 Client Secret')

    args = parser.parse_args()
    success = upload_to_gdrive(args)
    sys.exit(0 if success else 1)
