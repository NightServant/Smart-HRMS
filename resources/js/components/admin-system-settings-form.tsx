import { router } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Setting = {
    key: string;
    value: string | null;
    type: string;
    label: string;
    description: string | null;
};

type Props = {
    settings: Setting[];
    group: string;
};

export function AdminSystemSettingsForm({ settings, group }: Props) {
    const [values, setValues] = useState<Record<string, string | null>>(() => {
        const initial: Record<string, string | null> = {};
        for (const setting of settings) {
            initial[setting.key] = setting.value;
        }
        return initial;
    });

    const [saving, setSaving] = useState(false);

    const hasChanges = settings.some((setting) => values[setting.key] !== setting.value);

    const handleChange = (key: string, value: string | null) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const changedSettings = settings
            .filter((setting) => values[setting.key] !== setting.value)
            .map((setting) => ({
                key: setting.key,
                value: values[setting.key] ?? '',
            }));

        if (changedSettings.length === 0) return;

        setSaving(true);
        router.put(
            '/admin/system-settings',
            { settings: changedSettings },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div className="flex flex-col gap-4">
            {settings.map((setting) => (
                <div
                    key={setting.key}
                    className="grid items-center gap-4 rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md sm:grid-cols-2 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none"
                >
                    <div className="flex flex-col gap-1">
                        <Label htmlFor={setting.key} className="text-sm font-semibold">
                            {setting.label}
                        </Label>
                        {setting.description && (
                            <p className="text-xs text-muted-foreground">{setting.description}</p>
                        )}
                    </div>
                    <div className="flex items-center justify-end">
                        {setting.type === 'boolean' ? (
                            <Switch
                                id={setting.key}
                                checked={values[setting.key] === '1' || values[setting.key] === 'true'}
                                onCheckedChange={(checked) =>
                                    handleChange(setting.key, checked ? 'true' : 'false')
                                }
                            />
                        ) : setting.type === 'time' ? (
                            <Input
                                id={setting.key}
                                type="time"
                                value={values[setting.key] ?? ''}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                className="w-full max-w-xs"
                            />
                        ) : setting.type === 'integer' ? (
                            <Input
                                id={setting.key}
                                type="number"
                                step="1"
                                value={values[setting.key] ?? ''}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                className="w-full max-w-xs"
                            />
                        ) : setting.type === 'float' ? (
                            <Input
                                id={setting.key}
                                type="number"
                                step="0.1"
                                value={values[setting.key] ?? ''}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                className="w-full max-w-xs"
                            />
                        ) : (
                            <Input
                                id={setting.key}
                                type="text"
                                value={values[setting.key] ?? ''}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                className="w-full max-w-xs"
                            />
                        )}
                    </div>
                </div>
            ))}

            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
                    <Save className="size-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}
