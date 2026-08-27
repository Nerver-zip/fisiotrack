#include "../include/clinic/database_migration.hpp"

#include <cstdlib>
#include <iostream>
#include <string>
#include <system_error>
#include <vector>

namespace clinic {
namespace {

bool is_backup_database(const std::filesystem::path& path) {
    for (const auto& part : path) {
        if (part == "backups") return true;
    }
    return false;
}

bool copy_database_family(const std::filesystem::path& source, const std::filesystem::path& target) {
    std::error_code ec;
    std::filesystem::create_directories(target.parent_path(), ec);
    if (ec) return false;

    std::filesystem::copy_file(source, target, std::filesystem::copy_options::none, ec);
    if (ec) return false;
    std::filesystem::permissions(
        target,
        std::filesystem::perms::owner_read | std::filesystem::perms::owner_write,
        std::filesystem::perm_options::replace,
        ec
    );
    if (ec) return false;

    for (const std::string suffix : {"-wal", "-shm"}) {
        const auto companion_source = std::filesystem::path(source.string() + suffix);
        if (!std::filesystem::exists(companion_source)) continue;
        std::filesystem::copy_file(
            companion_source,
            std::filesystem::path(target.string() + suffix),
            std::filesystem::copy_options::none,
            ec
        );
        if (ec) return false;
        std::filesystem::permissions(
            std::filesystem::path(target.string() + suffix),
            std::filesystem::perms::owner_read | std::filesystem::perms::owner_write,
            std::filesystem::perm_options::replace,
            ec
        );
        if (ec) return false;
    }
    return true;
}

} // namespace

bool prepare_database_storage(
    const std::filesystem::path& project_root,
    const std::filesystem::path& target,
    std::ostream& output,
    std::ostream& errors
) {
    if (std::filesystem::exists(target)) return true;

    std::vector<std::filesystem::path> candidates;
    if (const char* configured_source = std::getenv("DB_MIGRATION_SOURCE")) {
        std::filesystem::path source(configured_source);
        if (source.is_relative()) source = project_root / source;
        if (!std::filesystem::is_regular_file(source)) {
            errors << "DB_MIGRATION_SOURCE não aponta para um arquivo válido.\n";
            return false;
        }
        candidates.push_back(std::move(source));
    } else {
        const auto data_root = project_root / "database";
        std::error_code ec;
        if (std::filesystem::exists(data_root)) {
            for (std::filesystem::recursive_directory_iterator it(data_root, ec), end; it != end && !ec; it.increment(ec)) {
                if (!it->is_regular_file() || it->path() == target || is_backup_database(it->path())) continue;
                if (it->path().extension() == ".db") candidates.push_back(it->path());
            }
        }
    }

    if (candidates.empty()) return true;
    if (candidates.size() > 1) {
        errors << "Há mais de um banco existente. Defina DB_MIGRATION_SOURCE com o arquivo correto.\n";
        return false;
    }

    if (!copy_database_family(candidates.front(), target)) {
        errors << "Não foi possível importar o banco existente; os arquivos de origem foram preservados.\n";
        return false;
    }
    output << "Banco existente importado para o armazenamento principal; a origem foi preservada.\n";
    return true;
}

} // namespace clinic
