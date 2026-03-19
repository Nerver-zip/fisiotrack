import sys
import os
import pickle
import socket
import time
import httplib2
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_httplib2 import AuthorizedHttp
from googleapiclient.errors import HttpError

# Configurações
SCOPES = ['https://www.googleapis.com/auth/drive.file']
REQUEST_TIMEOUT_SECONDS = int(os.getenv('GDRIVE_TIMEOUT_SECONDS', '60'))
MAX_RETRIES = int(os.getenv('GDRIVE_UPLOAD_RETRIES', '3'))

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CLIENT_SECRETS_FILE = os.path.join(PROJECT_ROOT, 'config', 'client_secrets.json')
TOKEN_FILE = os.path.join(PROJECT_ROOT, 'config', 'token.pickle')

def get_gdrive_service():
    creds = None
    # O arquivo token.pickle armazena os tokens de acesso e atualização do usuário
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
    
    # Se não houver credenciais válidas, pede ao usuário para logar
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CLIENT_SECRETS_FILE):
                raise Exception(f"Arquivo não encontrado: {CLIENT_SECRETS_FILE}. Siga as instruções para criar um OAuth Client ID.")
            
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
            # Usa porta fixa 8088 para facilitar redirecionamento em WSL/VMs
            print("\n" + "="*60)
            print("⚠️ ATENÇÃO: O navegador será aberto.")
            print("Após o login, se a página der erro 'Não foi possível acessar esse site',")
            print("copie a URL de erro que está no navegador, vá para o terminal e certifique-se")
            print("que a porta 8088 está liberada, ou acesse http://localhost:8088 manualmente.")
            print("="*60 + "\n")
            
            creds = flow.run_local_server(port=8088)
        
        # Salva as credenciais para o próximo uso
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)

    authed_http = AuthorizedHttp(creds, http=httplib2.Http(timeout=REQUEST_TIMEOUT_SECONDS))
    return build('drive', 'v3', http=authed_http, cache_discovery=False)


def parse_folder_id():
    dotenv_path = os.path.join(PROJECT_ROOT, '.env')
    if not os.path.exists(dotenv_path):
        return None

    with open(dotenv_path, encoding='utf-8') as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith('#') or not line.startswith('GDRIVE_FOLDER_ID='):
                continue
            _, value = line.split('=', 1)
            value = value.strip().strip('"').strip("'")
            return value or None
    return None


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

def upload_to_gdrive(file_path, filename):
    parent_id = parse_folder_id()

    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Arquivo de backup nao encontrado: {file_path}")

        service = get_gdrive_service()

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
            print(f"✅ Backup atualizado no seu GDrive! ID: {file_id}")
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
            print(f"✅ Novo backup criado no seu GDrive! ID: {new_file.get('id')}")
        
        return True
    except Exception as e:
        print(f"❌ Erro no upload: {type(e).__name__}: {str(e)}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(1)
    success = upload_to_gdrive(sys.argv[1], sys.argv[2])
    sys.exit(0 if success else 1)
