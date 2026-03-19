#!/bin/bash

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}📦 Configurando ambiente virtual Python para Backup...${NC}"

# Cria o venv se não existir
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

# Instala dependências
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install -r requirements.txt

echo -e "${GREEN}✅ Ambiente configurado com sucesso!${NC}"
echo -e "Lembre-se de configurar o ${GREEN}GDRIVE_FOLDER_ID${NC} no arquivo .env se desejar usar uma pasta específica."
