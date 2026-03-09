<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

test('it verifies source and target row counts', function () {
    $sourceDatabasePath = database_path('verify-source.sqlite');
    $targetDatabasePath = database_path('verify-target.sqlite');

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
    });

    Schema::connection('mysql_target')->create('users', function ($table): void {
        $table->id();
        $table->string('name');
    });

    DB::connection('sqlite_source')->table('users')->insert([
        ['id' => 1, 'name' => 'User One'],
    ]);
    DB::connection('mysql_target')->table('users')->insert([
        ['id' => 1, 'name' => 'User One'],
    ]);

    $exitCode = Artisan::call('app:verify-sqlite-mysql-sync', ['--strict' => true]);

    expect($exitCode)->toBe(0);

    @unlink($sourceDatabasePath);
    @unlink($targetDatabasePath);
});
