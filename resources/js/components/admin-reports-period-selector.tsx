import { router } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ReportsDashboardController from '@/actions/App/Http/Controllers/Admin/ReportsDashboardController';
import * as admin from '@/routes/admin';

type Props = {
    period: string;
    dateFrom: string;
    dateTo: string;
};

const PERIOD_OPTIONS = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom' },
];

export function AdminReportsPeriodSelector({ period, dateFrom, dateTo }: Props) {
    const [selectedPeriod, setSelectedPeriod] = useState(period);
    const [fromDate, setFromDate] = useState(dateFrom);
    const [toDate, setToDate] = useState(dateTo);

    const navigate = (params: { period?: string; dateFrom?: string; dateTo?: string }) => {
        router.get(
            admin.reports().url,
            {
                period: params.period ?? selectedPeriod,
                dateFrom: params.dateFrom ?? fromDate,
                dateTo: params.dateTo ?? toDate,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePeriodChange = (value: string) => {
        setSelectedPeriod(value);
        navigate({ period: value });
    };

    const handleDateFromChange = (value: string) => {
        setFromDate(value);
        navigate({ dateFrom: value });
    };

    const handleDateToChange = (value: string) => {
        setToDate(value);
        navigate({ dateTo: value });
    };

    const exportUrl = ReportsDashboardController.export.url({
        query: {
            period: selectedPeriod,
            dateFrom: fromDate,
            dateTo: toDate,
        },
    });

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-44">
                    <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {PERIOD_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>

            {selectedPeriod === 'custom' && (
                <>
                    <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => handleDateFromChange(e.target.value)}
                        className="w-40"
                    />
                    <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => handleDateToChange(e.target.value)}
                        className="w-40"
                    />
                </>
            )}

            <div className="ml-auto">
                <Button variant="outline" asChild className="gap-2">
                    <a href={exportUrl}>
                        <Download className="size-4" />
                        Export CSV
                    </a>
                </Button>
            </div>
        </div>
    );
}
