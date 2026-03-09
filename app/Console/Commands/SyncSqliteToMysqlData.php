<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class SyncSqliteToMysqlData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:sync-sqlite-to-mysql-data
                            {--chunk=500 : Number of rows per insert batch}
                            {--append : Keep target rows and append source rows}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Copy all SQLite source data into the MySQL target database in chunks.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $chunkSize = max((int) $this->option('chunk'), 1);
        $append = (bool) $this->option('append');

        $sourceConnection = DB::connection('sqlite_source');
        $targetConnection = DB::connection('mysql_target');
        $targetSchema = Schema::connection('mysql_target');

        if ($sourceConnection->getDriverName() !== 'sqlite') {
            $this->error('sqlite_source connection must use the sqlite driver.');

            return self::FAILURE;
        }

        $tables = $this->sourceTables($sourceConnection);
        if ($tables === []) {
            $this->warn('No source tables found to migrate.');

            return self::SUCCESS;
        }

        $this->components->info('Starting data sync from sqlite_source to mysql_target.');

        try {
            $this->setForeignKeyChecks($targetConnection, false);

            foreach ($tables as $table) {
                if (! $targetSchema->hasTable($table)) {
                    $this->components->warn("Skipping table '{$table}' because it does not exist in mysql_target.");

                    continue;
                }

                $sourceColumns = Schema::connection('sqlite_source')->getColumnListing($table);
                $targetColumns = $targetSchema->getColumnListing($table);
                $commonColumns = array_values(array_intersect($sourceColumns, $targetColumns));

                if ($commonColumns === []) {
                    $this->components->warn("Skipping table '{$table}' because no common columns were found.");

                    continue;
                }

                if (! $append) {
                    $targetConnection->table($table)->truncate();
                }

                $sourceTotal = (int) $sourceConnection->table($table)->count();
                if ($sourceTotal === 0) {
                    $this->line("Table '{$table}': source is empty.");

                    continue;
                }

                $this->line("Table '{$table}': copying {$sourceTotal} rows...");

                $offset = 0;
                while (true) {
                    $rows = $sourceConnection->table($table)
                        ->select($commonColumns)
                        ->offset($offset)
                        ->limit($chunkSize)
                        ->get();

                    if ($rows->isEmpty()) {
                        break;
                    }

                    $payload = $rows->map(static fn ($row): array => (array) $row)->all();
                    $targetConnection->table($table)->insert($payload);

                    $offset += count($payload);
                }
            }
        } catch (Throwable $exception) {
            $this->setForeignKeyChecks($targetConnection, true);
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->setForeignKeyChecks($targetConnection, true);
        $this->components->info('Data sync completed successfully.');

        return self::SUCCESS;
    }

    /**
     * @return list<string>
     */
    private function sourceTables(ConnectionInterface $sourceConnection): array
    {
        $tables = $sourceConnection->select("
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
              AND name != 'migrations'
        ");

        return collect($tables)
            ->map(static fn (object $table): string => (string) $table->name)
            ->values()
            ->all();
    }

    private function setForeignKeyChecks(ConnectionInterface $connection, bool $enabled): void
    {
        $driver = $connection->getDriverName();

        if ($driver === 'mysql') {
            $connection->statement('SET FOREIGN_KEY_CHECKS='.(int) $enabled);

            return;
        }

        if ($driver === 'sqlite') {
            $connection->statement('PRAGMA foreign_keys = '.($enabled ? 'ON' : 'OFF'));
        }
    }
}
