<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class VerifySqliteMysqlSync extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:verify-sqlite-mysql-sync
                            {--strict : Return failure code when mismatches are found}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Compare row counts between sqlite_source and mysql_target tables.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $sourceConnection = DB::connection('sqlite_source');
        $targetConnection = DB::connection('mysql_target');
        $targetSchema = Schema::connection('mysql_target');
        $strict = (bool) $this->option('strict');

        if ($sourceConnection->getDriverName() !== 'sqlite') {
            $this->error('sqlite_source connection must use the sqlite driver.');

            return self::FAILURE;
        }

        $tables = $this->sourceTables($sourceConnection);
        if ($tables === []) {
            $this->warn('No source tables found to verify.');

            return self::SUCCESS;
        }

        $mismatches = [];
        $missingTables = [];

        $this->components->info('Verifying row counts between sqlite_source and mysql_target...');

        try {
            foreach ($tables as $table) {
                if (! $targetSchema->hasTable($table)) {
                    $missingTables[] = $table;
                    $this->components->warn("Target table missing: {$table}");

                    continue;
                }

                $sourceCount = (int) $sourceConnection->table($table)->count();
                $targetCount = (int) $targetConnection->table($table)->count();

                $status = $sourceCount === $targetCount ? 'OK' : 'MISMATCH';
                $this->line(sprintf(
                    '[%s] %s: source=%d target=%d',
                    $status,
                    $table,
                    $sourceCount,
                    $targetCount
                ));

                if ($sourceCount !== $targetCount) {
                    $mismatches[] = $table;
                }
            }
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($missingTables !== []) {
            $this->newLine();
            $this->components->warn('Missing target tables: '.implode(', ', $missingTables));
        }

        if ($mismatches !== []) {
            $this->newLine();
            $this->components->warn('Mismatched tables: '.implode(', ', $mismatches));
        }

        if ($missingTables === [] && $mismatches === []) {
            $this->components->info('Verification successful. Row counts match for all source tables.');

            return self::SUCCESS;
        }

        if ($strict) {
            return self::FAILURE;
        }

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
}
