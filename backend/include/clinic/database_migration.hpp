#pragma once

#include <filesystem>
#include <iosfwd>

namespace clinic {

bool prepare_database_storage(
    const std::filesystem::path& project_root,
    const std::filesystem::path& target,
    std::ostream& output,
    std::ostream& errors
);

} // namespace clinic
