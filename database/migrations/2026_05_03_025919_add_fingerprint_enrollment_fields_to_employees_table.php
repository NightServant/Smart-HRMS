<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            // Persisted "fingerprint is on file at the terminal" signal,
            // written once verificationStatus confirms either the open API
            // or the portal sees a credential. Without this the badge would
            // reset to "Not enrolled" on every login because the React
            // component state is in-memory only and hasBiometricActivity()
            // doesn't flip until the user actually punches in.
            $table->timestamp('fingerprint_enrolled_at')->nullable()->after('zlink_sync_error');
            $table->unsignedTinyInteger('fingerprint_finger_index')->nullable()->after('fingerprint_enrolled_at');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropColumn(['fingerprint_enrolled_at', 'fingerprint_finger_index']);
        });
    }
};
