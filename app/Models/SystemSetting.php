<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
        'label',
        'description',
        'updated_by',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = Cache::remember(
            "system_settings.{$key}",
            now()->addHours(24),
            fn () => static::query()->where('key', $key)->first(),
        );

        if (! $setting) {
            return $default;
        }

        return self::castValue($setting->value, $setting->type);
    }

    public static function set(string $key, mixed $value, int $userId): void
    {
        static::query()->where('key', $key)->update([
            'value' => (string) $value,
            'updated_by' => $userId,
        ]);

        Cache::forget("system_settings.{$key}");
        Cache::forget("system_settings.group.{$key}");
    }

    public static function setIpcrTargetMode(string $mode, int $userId): void
    {
        static::query()->updateOrCreate(
            ['key' => 'ipcr_target_mode'],
            [
                'value' => $mode,
                'type' => 'string',
                'group' => 'ipcr',
                'label' => 'IPCR Target Mode',
                'description' => 'Controls whether the IPCR target form follows the calendar automatically or is forced open/closed by HR.',
                'updated_by' => $userId,
            ],
        );

        Cache::forget('system_settings.ipcr_target_mode');
        Cache::forget('system_settings.group.ipcr');
    }

    public static function getGroup(string $group): Collection
    {
        return Cache::remember(
            "system_settings.group.{$group}",
            now()->addHours(24),
            fn () => static::query()->where('group', $group)->orderBy('id')->get(),
        );
    }

    private static function castValue(?string $value, string $type): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            'integer' => (int) $value,
            'float' => (float) $value,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            default => $value,
        };
    }
}
