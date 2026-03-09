<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

test('it copies source records into target records with ids preserved', function () {
    $sourceDatabasePath = database_path('testing-source.sqlite');
    $targetDatabasePath = database_path('testing-target.sqlite');

    @unlink($sourceDatabasePath);
    @unlink($targetDatabasePath);
    touch($sourceDatabasePath);
    touch($targetDatabasePath);

    Config::set('database.connections.sqlite_source', [
        'driver' => 'sqlite',
        'database' => $sourceDatabasePath,
        'prefix' => '',
        'foreign_key_constraints' => true,
    ]);

    Config::set('database.connections.mysql_target', [
        'driver' => 'sqlite',
        'database' => $targetDatabasePath,
        'prefix' => '',
        'foreign_key_constraints' => true,
    ]);

    DB::purge('sqlite_source');
    DB::purge('mysql_target');

    Schema::connection('sqlite_source')->create('users', function ($table): void {
        $table->id();
        $table->string('name');
        $table->string('email');
        $table->timestamp('created_at')->nullable();
        $table->timestamp('updated_at')->nullable();
    });

    Schema::connection('mysql_target')->create('users', function ($table): void {
        $table->id();
        $table->string('name');
        $table->string('email');
        $table->timestamp('created_at')->nullable();
        $table->timestamp('updated_at')->nullable();
    });

    DB::connection('sqlite_source')->table('users')->insert([
        [
            'id' => 10,
            'name' => 'User One',
            'email' => 'one@example.com',
            'created_at' => '2026-03-01 09:00:00',
            'updated_at' => '2026-03-01 09:00:00',
        ],
        [
            'id' => 20,
            'name' => 'User Two',
            'email' => 'two@example.com',
            'created_at' => '2026-03-02 10:00:00',
            'updated_at' => '2026-03-02 10:00:00',
        ],
    ]);

    $exitCode = Artisan::call('app:sync-sqlite-to-mysql-data', ['--chunk' => 1]);

    expect($exitCode)->toBe(0);
    expect(DB::connection('mysql_target')->table('users')->count())->toBe(2);
    expect(DB::connection('mysql_target')->table('users')->where('id', 10)->value('name'))->toBe('User One');
    expect(DB::connection('mysql_target')->table('users')->where('id', 20)->value('email'))->toBe('two@example.com');

    @unlink($sourceDatabasePath);
    @unlink($targetDatabasePath);
});
