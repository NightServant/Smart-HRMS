<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ipcr_periods', function (Blueprint $table) {
            $table->id();
            // Period type — `target` is the IPCR target-setting window,
            // `evaluation` is the IPCR submission/evaluation window.
            $table->string('type', 20);
            $table->unsignedTinyInteger('semester');
            $table->unsignedSmallInteger('year');
            // Lifecycle status — `open` while submissions are accepted, `closed`
            // when HR shuts the window, `backfilled` when records are entered
            // historically without a live submission flow (Phase 3).
            $table->string('status', 20)->default('open');
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->unsignedBigInteger('opened_by')->nullable();
            $table->unsignedBigInteger('closed_by')->nullable();
            // When HR opens a period that is not the next eligible one
            // (e.g. opening Sem 1 of next year while Sem 2 of current year is
            // still active), they must supply a justification — persisted here
            // for audit.
            $table->text('override_reason')->nullable();
            $table->timestamps();

            $table->unique(['type', 'semester', 'year']);
            $table->index(['type', 'status']);

            $table->foreign('opened_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('closed_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ipcr_periods');
    }
};
