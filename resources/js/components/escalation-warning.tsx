import { AlertTriangle } from 'lucide-react';

export default function EscalationWarning({
    reason,
}: {
    reason: string | null;
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    This submission has been escalated
                </p>
                {reason && (
                    <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                        {reason}
                    </p>
                )}
            </div>
        </div>
    );
}
