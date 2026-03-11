#include <iostream>
#include <format>
#include <string>

int main() {
    std::string version = "0.1.0";
    std::cout << std::format("FisioTrack Backend v{} - Sistema de Gestão de Clínica de Fisioterapia\n", version);
    std::cout << "Servidor iniciado com sucesso. Aguardando implementações...\n";
    return 0;
}
