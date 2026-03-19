#!/bin/bash

# Cores para o output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Garantir que estamos no diretório do script
cd "$(dirname "$0")"
ROOT_DIR=$(pwd)

cleanup() {
    echo -e "\n${RED}Finalizando processos...${NC}"
    # Mata todos os processos filhos desta sessão do script
    pkill -P $$ 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

show_menu() {
    clear
    echo -e "${GREEN}============================================"
    echo -e "       FISIOTRACK - GESTÃO DE CLÍNICA       "
    echo -e "==========================================${NC}"
    echo -e "Escolha uma opção de execução:"
    echo "1) Backend (Rebuild + Run)"
    echo "2) Frontend (Dev Mode)"
    echo "3) Full Stack (Build Back + Run All)"
    echo "4) Full Stack (Run All - Sem Build)"
    echo "5) Executar Testes (Build + Run)"
    echo "q) Sair"
    echo -e "${GREEN}==========================================${NC}"
}

run_backend_rebuild() {
    echo -e "${BLUE}Limpando cache e Compilando Backend...${NC}"
    (
        cd "$ROOT_DIR"
        rm -rf backend/build
        mkdir -p backend/build
        cd backend/build
        if ! cmake ..; then
            echo -e "${RED}Erro no CMake.${NC}"
            exit 1
        fi
        if ! make -j$(nproc) fisio_track_server; then
            echo -e "${RED}Erro na compilação do Backend.${NC}"
            exit 1
        fi
        echo -e "${GREEN}Backend compilado com sucesso! Iniciando...${NC}"
        ./fisio_track_server
    )
    if [ $? -ne 0 ]; then
        read -p "Erro detectado. Pressione Enter para voltar ao menu..."
    fi
}

run_frontend_dev() {
    echo -e "${BLUE}Iniciando Frontend React (Dev)...${NC}"
    (
        cd "$ROOT_DIR/frontend"
        npm run dev
    )
}

run_full_stack() {
    local rebuild=$1
    if [ "$rebuild" = true ]; then
        echo -e "${BLUE}Buildando Backend...${NC}"
        (
            cd "$ROOT_DIR"
            rm -rf backend/build
            mkdir -p backend/build
            cd backend/build
            cmake .. && make -j$(nproc) fisio_track_server
        )
        if [ $? -ne 0 ]; then
            echo -e "${RED}Erro no build do backend. Abortando Full Stack.${NC}"
            read -p "Pressione Enter para voltar ao menu..."
            return
        fi
    fi

    echo -e "${GREEN}Iniciando Backend em background...${NC}"
    "$ROOT_DIR/backend/build/fisio_track_server" &
    BACKEND_PID=$!
    
    echo -e "${GREEN}Iniciando Frontend...${NC}"
    (
        cd "$ROOT_DIR/frontend"
        npm run dev
    )

    # Ao sair do frontend (Ctrl+C), mata o backend se ainda estiver rodando
    kill $BACKEND_PID 2>/dev/null
}

run_tests() {
    echo -e "${BLUE}Limpando cache e Compilando Testes do Backend...${NC}"
    (
        cd "$ROOT_DIR"
        rm -rf backend/build
        mkdir -p backend/build
        cd backend/build
        cmake .. && make -j$(nproc) unit_tests
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Executando Testes do Backend (Google Test)...${NC}"
            ./unit_tests
        else
            echo -e "${RED}Erro na compilação dos testes do backend.${NC}"
            exit 1
        fi
    )
    if [ $? -ne 0 ]; then
        read -p "Falha nos testes de backend. Pressione Enter para continuar para o frontend..."
    fi

    echo -e "\n${BLUE}Executando Testes do Frontend (React Scripts)...${NC}"
    (
        cd "$ROOT_DIR/frontend"
        CI=true npm test -- --watchAll=false
    )
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Testes do frontend concluídos com sucesso!${NC}"
    else
        echo -e "${RED}Falha em um ou mais testes do frontend.${NC}"
    fi

    echo -e "\n${GREEN}Relatório Final de Testes Gerado.${NC}"
    read -p "Pressione Enter para voltar ao menu..."
}

while true; do
    show_menu
    read -p "Opção: " opt
    
    case $opt in
        1) run_backend_rebuild ;;
        2) run_frontend_dev ;;
        3) run_full_stack true ;;
        4) run_full_stack false ;;
        5) run_tests ;;
        q) exit 0 ;;
        *) echo -e "${RED}Opção inválida!${NC}"; sleep 1 ;;
    esac
done
