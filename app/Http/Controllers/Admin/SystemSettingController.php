<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BiometricDevice;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingController extends Controller
{
    public function index(): Response
    {
        $allSettings = SystemSetting::query()->orderBy('id')->get();

        $grouped = $allSettings->groupBy('group')->map(fn ($settings) => $settings->map(fn (SystemSetting $setting): array => [
            'key' => $setting->key,
            'value' => $setting->value,
            'type' => $setting->type,
            'label' => $setting->label,
            'description' => $setting->description,
        ])->values()->all())->all();

        $devices = BiometricDevice::query()->orderBy('name')->get()->map(fn (BiometricDevice $device): array => [
            'id' => $device->id,
            'serialNumber' => $device->serial_number,
            'name' => $device->name,
            'lastActivityAt' => $device->last_activity_at?->format('Y-m-d H:i:s'),
            'recordsSynced' => $device->records_synced ?? 0,
            'isActive' => (bool) $device->is_active,
        ])->all();

        $lastUpdated = $allSettings->max('updated_at')?->format('M d, Y h:i A') ?? 'Never';

        return Inertia::render('admin/system-settings', [
            'settings' => $grouped,
            'biometricDevices' => $devices,
            'groupCount' => count($grouped),
            'lastUpdated' => $lastUpdated,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string|exists:system_settings,key',
            'settings.*.value' => 'nullable|string',
        ]);

        $userId = $request->user()->id;

        foreach ($request->input('settings') as $item) {
            $setting = SystemSetting::query()->where('key', $item['key'])->first();

            if (! $setting) {
                continue;
            }

            // Validate value based on type
            $this->validateSettingValue($item['key'], $item['value'] ?? '', $setting->type);

            SystemSetting::set($item['key'], $item['value'] ?? '', $userId);
        }

        return back()->with('success', 'Settings updated successfully.');
    }

    public function updateDevice(Request $request, BiometricDevice $device): RedirectResponse
    {
        $device->update([
            'is_active' => ! $device->is_active,
        ]);

        $status = $device->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Device {$device->name} {$status} successfully.");
    }

    private function validateSettingValue(string $key, string $value, string $type): void
    {
        match ($type) {
            'integer' => is_numeric($value) || throw ValidationException::withMessages([$key => "The {$key} setting must be a valid integer."]),
            'float' => is_numeric($value) || throw ValidationException::withMessages([$key => "The {$key} setting must be a valid number."]),
            'boolean' => in_array($value, ['true', 'false', '1', '0'], true) || throw ValidationException::withMessages([$key => "The {$key} setting must be true or false."]),
            default => null,
        };
    }
}
