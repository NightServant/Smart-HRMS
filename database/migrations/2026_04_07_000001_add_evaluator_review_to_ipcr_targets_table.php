<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ipcr_targets', function (Blueprint $table) {
            $table->string('evaluator_id', 20)->nullable()->after('submitted_at');
            $table->string('evaluator_decision', 20)->nullable()->after('evaluator_id');
            $table->text('evaluator_remarks')->nullable()->after('evaluator_decision');
            $table->timestamp('evaluator_reviewed_at')->nullable()->after('evaluator_remarks');
            $table->boolean('hr_finalized')->default(false)->after('evaluator_reviewed_at');

            $table->foreign('evaluator_id')
                ->references('employee_id')
                ->on('employees')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ipcr_targets', function (Blueprint $table) {
            $table->dropForeign(['evaluator_id']);
            $table->dropColumn([
                'evaluator_id',
                'evaluator_decision',
                'evaluator_remarks',
                'evaluator_reviewed_at',
                'hr_finalized',
            ]);
        });
    }
};
