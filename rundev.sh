#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
    echo -e "\n${RED}Finalizando processos...${NC}"
    pkill -P $$
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
    rm -rf backend/build
    mkdir -p backend/build
    cd backend/build
    cmake ..
    make -j$(nproc) fisio_track_server
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Backend compilado com sucesso! Iniciando...${NC}"
        ./fisio_track_server
    else
        echo -e "${RED}Erro na compilação do Backend.${NC}"
    fi
    cd ../..
}

run_frontend_dev() {
    echo -e "${BLUE}Iniciando Frontend React (Dev)...${NC}"
    cd frontend
    npm run dev
    cd ..
}

run_full_stack() {
    local rebuild=$1
    if [ "$rebuild" = true ]; then
        echo -e "${BLUE}Buildando Backend...${NC}"
        mkdir -p backend/build && cd backend/build && cmake .. && make -j$(nproc) fisio_track_server && cd ../..
    fi

    echo -e "${GREEN}Iniciando Backend em background...${NC}"
    ./backend/build/fisio_track_server &
    
    echo -e "${GREEN}Iniciando Frontend...${NC}"
    cd frontend
    npm run dev
    cd ..
}

run_tests() {
    echo -e "${BLUE}Limpando cache e Compilando Testes...${NC}"
    rm -rf backend/build
    mkdir -p backend/build
    cd backend/build
    cmake ..
    make -j$(nproc) unit_tests
    if [ $? -eq 0 ]; then
        ./unit_tests
    else
        echo -e "${RED}Erro na compilação dos testes.${NC}"
    fi
    cd ../..
    read -p "Pressione Enter para voltar ao menu..."
}

while true; do
    show_menu
    read -p "Opção: " opt
    case $option in # Use lowercase for local check or fix variable name
        *) ;; 
    esac
    
    # Corrigindo para usar a variável opt
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
