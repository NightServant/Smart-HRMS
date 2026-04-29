<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->string('webauthn_credential_id', 512)->nullable()->after('zkteco_pin');
            $table->text('webauthn_public_key')->nullable()->after('webauthn_credential_id');
            $table->unsignedBigInteger('webauthn_sign_count')->default(0)->after('webauthn_public_key');
            $table->binary('webauthn_user_handle', 16)->nullable()->after('webauthn_sign_count');
            $table->timestamp('webauthn_enrolled_at')->nullable()->after('webauthn_user_handle');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropColumn([
                'webauthn_credential_id',
                'webauthn_public_key',
                'webauthn_sign_count',
                'webauthn_user_handle',
                'webauthn_enrolled_at',
            ]);
        });
    }
};
