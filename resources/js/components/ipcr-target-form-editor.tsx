import {
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
} from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cloneIpcrFormPayload } from '@/lib/ipcr';
import { cn } from '@/lib/utils';
import type { IpcrFormPayload } from '@/types/ipcr';

type Props = {
    formPayload: IpcrFormPayload;
    onChange: (next: IpcrFormPayload) => void;
    disabled?: boolean;
};

export default function IpcrTargetFormEditor({
    formPayload,
    onChange,
    disabled = false,
}: Props) {
    const [currentStep, setCurrentStep] = useState(0);
    const sections = formPayload.sections;
    const currentSection = sections[currentStep] ?? sections[0];
    const stripedRowClasses = [
        'border-b border-[#D4EBC8] bg-white transition-colors duration-150 hover:bg-[#EBF7E5] dark:border-[#263E26] dark:bg-[#18291A]/40 dark:hover:bg-[#243C24]/70',
        'border-b border-[#D4EBC8] bg-[#F2FAF0] transition-colors duration-150 hover:bg-[#EBF7E5] dark:border-[#263E26] dark:bg-[#1D2E1D]/60 dark:hover:bg-[#243C24]/70',
    ];

    const filledRows = useMemo(
        () =>
            formPayload.sections.reduce(
                (count, section) =>
                    count +
                    section.rows.filter(
                        (row) => row.accountable.trim().length > 0,
                    ).length,
                0,
            ),
        [formPayload.sections],
    );
    const totalRows = useMemo(
        () =>
            formPayload.sections.reduce(
                (count, section) => count + section.rows.length,
                0,
            ),
        [formPayload.sections],
    );

    function updateTarget(rowId: string, value: string): void {
        const next = cloneIpcrFormPayload(formPayload);
        next.sections = next.sections.map((section) => ({
            ...section,
            rows: section.rows.map((row) =>
                row.id === rowId ? { ...row, accountable: value } : row,
            ),
        }));
        onChange(next);
    }

    if (!currentSection) {
        return null;
    }

    const sectionFilledRows = currentSection.rows.filter(
        (row) => row.accountable.trim().length > 0,
    ).length;
    const sectionTotalRows = currentSection.rows.length;
    const sectionAllFilled = sectionFilledRows === sectionTotalRows;

    return (
        <Card className="glass-card min-w-0 overflow-hidden border border-border bg-card shadow-sm">
            <CardHeader className="gap-4 border-b border-border bg-card px-4 py-5 sm:px-6">
                <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.24em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                            <FileSpreadsheet className="size-3.5" />
                            IPCR Target Form
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Define your performance targets for each criterion.
                            These will be referenced when you submit your IPCR
                            with actual accomplishments.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-sm">
                        <Badge variant="outline">
                            {filledRows}/{totalRows} filled
                        </Badge>
                        <Badge variant="outline">
                            Section {currentStep + 1}/{sections.length}
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {sections.map((section, index) => (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => setCurrentStep(index)}
                            className={cn(
                                'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                                index === currentStep
                                    ? 'border-[#2F5E2B] bg-[#2F5E2B] text-white shadow-sm dark:border-[#4A7C3C] dark:bg-[#1F3F1D]'
                                    : 'border-border bg-card text-foreground hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80',
                            )}
                        >
                            {index + 1}. {section.title}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="space-y-4 px-3 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                            {currentSection.title}
                        </h3>
                        <Badge
                            className={cn(
                                sectionAllFilled
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                            )}
                        >
                            {sectionFilledRows}/{sectionTotalRows} filled
                        </Badge>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentStep((s) => Math.max(0, s - 1))
                            }
                            disabled={currentStep === 0}
                        >
                            <ChevronLeft className="size-4" />
                            Previous
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentStep((s) =>
                                    Math.min(sections.length - 1, s + 1),
                                )
                            }
                            disabled={currentStep === sections.length - 1}
                        >
                            Next
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>

                <div className="glass-card overflow-hidden rounded-[26px] border border-border bg-card shadow-sm">
                    <Table className="min-w-[56rem]">
                        <TableHeader>
                            <TableRow className="bg-[#2F5E2B] hover:bg-[#2F5E2B] dark:bg-[#1A3D1A] dark:hover:bg-[#1A3D1A] border-0">
                                <TableHead className="w-[16rem] min-w-[16rem] px-5 py-3.5 text-xs font-semibold tracking-wider uppercase text-white border-r border-white/10">
                                    Administrative Services Criteria
                                </TableHead>
                                <TableHead className="w-[13rem] min-w-[13rem] px-5 py-3.5 text-xs font-semibold tracking-wider uppercase text-white border-r border-white/10">
                                    Success Measures
                                </TableHead>
                                <TableHead className="px-5 py-3.5 text-xs font-semibold tracking-wider uppercase text-white">
                                    Target{' '}
                                    <span className="text-xs font-normal opacity-80 normal-case tracking-normal">
                                        (describe your planned accomplishment)
                                    </span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentSection.rows.map((row, rowIndex) => (
                                <Fragment key={row.id}>
                                    <TableRow
                                        className={
                                            stripedRowClasses[rowIndex % 2]
                                        }
                                    >
                                        <TableCell className="px-5 py-3.5 align-top">
                                            <div className="space-y-1">
                                                <p className="leading-snug font-semibold text-foreground">
                                                    {row.target}
                                                </p>
                                                {row.target_details && (
                                                    <p className="text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                                                        {row.target_details}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-3.5 align-top">
                                            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                                                {row.measures}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-5 py-3.5 align-top">
                                            <Textarea
                                                value={row.accountable}
                                                disabled={disabled}
                                                onChange={(e) =>
                                                    updateTarget(
                                                        row.id,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Describe the specific target or planned output for this criterion."
                                                className="[field-sizing:fixed] min-h-[9rem] w-full resize-y border-border bg-background text-sm leading-6"
                                            />
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
