#include <gtest/gtest.h>
#include <filesystem>
#include <fstream>
#include <sstream>
#include "../include/clinic/database_migration.hpp"
#include "../include/clinic/sqlite_database.hpp"

namespace clinic {
namespace {

void write_fixture(const std::filesystem::path& path, const std::string& content) {
    std::filesystem::create_directories(path.parent_path());
    std::ofstream output(path, std::ios::binary);
    output << content;
}

} // namespace

TEST(DatabaseMigrationTest, ImportsOnlyExistingDatabaseAndPreservesSource) {
    const auto root = std::filesystem::temp_directory_path() / "fisiotrack_migration_one";
    std::filesystem::remove_all(root);
    const auto source = root / "database" / "archive" / "records.db";
    const auto target = root / "database" / "patients.db";
    std::filesystem::create_directories(source.parent_path());
    SqliteDatabase original;
    ASSERT_TRUE(original.open(source.string(), "TestPass1"));
    Patient patient;
    patient.name = "Paciente Migrado";
    ASSERT_TRUE(original.add_patient(patient));
    original.close();
    std::ostringstream output;
    std::ostringstream errors;

    ASSERT_TRUE(prepare_database_storage(root, target, output, errors));
    EXPECT_TRUE(std::filesystem::exists(source));
    EXPECT_TRUE(std::filesystem::exists(target));
    EXPECT_TRUE(errors.str().empty());
    const auto permissions = std::filesystem::status(target).permissions();
    EXPECT_EQ(permissions & std::filesystem::perms::group_all, std::filesystem::perms::none);
    EXPECT_EQ(permissions & std::filesystem::perms::others_all, std::filesystem::perms::none);

    SqliteDatabase imported;
    ASSERT_TRUE(imported.open(target.string(), "TestPass1"));
    const auto patients = imported.get_all_patients();
    ASSERT_EQ(patients.size(), 1);
    EXPECT_EQ(patients.front().name, "Paciente Migrado");
    imported.close();
    std::filesystem::remove_all(root);
}

TEST(DatabaseMigrationTest, RefusesAmbiguousSourcesWithoutChangingThem) {
    const auto root = std::filesystem::temp_directory_path() / "fisiotrack_migration_many";
    std::filesystem::remove_all(root);
    write_fixture(root / "database" / "a" / "records.db", "a");
    write_fixture(root / "database" / "b" / "records.db", "b");
    const auto target = root / "database" / "patients.db";
    std::ostringstream output;
    std::ostringstream errors;

    EXPECT_FALSE(prepare_database_storage(root, target, output, errors));
    EXPECT_FALSE(std::filesystem::exists(target));
    EXPECT_FALSE(errors.str().empty());
    std::filesystem::remove_all(root);
}

TEST(DatabaseMigrationTest, IgnoresBackupsDuringDiscovery) {
    const auto root = std::filesystem::temp_directory_path() / "fisiotrack_migration_backup";
    std::filesystem::remove_all(root);
    write_fixture(root / "database" / "backups" / "daily.db", "backup");
    const auto target = root / "database" / "patients.db";
    std::ostringstream output;
    std::ostringstream errors;

    EXPECT_TRUE(prepare_database_storage(root, target, output, errors));
    EXPECT_FALSE(std::filesystem::exists(target));
    std::filesystem::remove_all(root);
}

} // namespace clinic
