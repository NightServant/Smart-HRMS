import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

function formatRemaining(ms: number): string {
    if (ms <= 0) return 'Expired';
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

export default function AppealCountdown({
    closesAt,
}: {
    closesAt: string;
}) {
    const [remaining, setRemaining] = useState(() => {
        return new Date(closesAt).getTime() - Date.now();
    });

    useEffect(() => {
        const id = setInterval(() => {
            setRemaining(new Date(closesAt).getTime() - Date.now());
        }, 1000);
        return () => clearInterval(id);
    }, [closesAt]);

    const isExpired = remaining <= 0;
    const isUrgent = remaining > 0 && remaining < 6 * 3_600_000;

    return (
        <div
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                isExpired
                    ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
                    : isUrgent
                      ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                      : 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400'
            }`}
        >
            <Timer className="size-4" />
            {isExpired ? 'Appeal Window Expired' : `Time Remaining: ${formatRemaining(remaining)}`}
        </div>
    );
}
