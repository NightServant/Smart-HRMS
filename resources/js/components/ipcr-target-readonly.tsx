import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { IpcrTarget } from '@/types/ipcr';

type Props = {
    target: IpcrTarget;
    title?: string;
    description?: string;
};

export default function IpcrTargetReadonly({
    target,
    title = 'Submitted IPCR Targets',
    description = 'Your targets have been submitted and are locked. They will be referenced in your IPCR submission.',
}: Props) {
    const [currentStep, setCurrentStep] = useState(0);
    const payload = target.form_payload;

    if (!payload) {
        return null;
    }

    const sections = payload.sections;
    const currentSection = sections[currentStep] ?? sections[0];
    const stripedRowClasses = [
        'bg-[#DDEFD7] dark:bg-[#345A34]/80',
        'bg-[#BFDDB5] dark:bg-[#274827]/80',
    ];

    if (!currentSection) {
        return null;
    }

    return (
        <Card className="glass-card min-w-0 overflow-hidden border border-border bg-card shadow-sm">
            <CardHeader className="gap-4 border-b border-border bg-card px-4 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
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
                <h3 className="text-lg font-semibold text-foreground">
                    {currentSection.title}
                </h3>
                <div className="glass-card overflow-hidden rounded-[26px] border border-border bg-card shadow-sm">
                    <Table className="min-w-[52rem]">
                        <TableHeader>
                            <TableRow className="bg-[#2F5E2B] hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:border-r [&_th]:border-white/10 [&_th]:text-white">
                                <TableHead className="w-[16rem] min-w-[16rem]">
                                    Administrative Services Criteria
                                </TableHead>
                                <TableHead className="w-[13rem] min-w-[13rem]">
                                    Success Measures
                                </TableHead>
                                <TableHead>Target</TableHead>
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
                                        <TableCell className="align-top">
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
                                        <TableCell className="align-top">
                                            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                                                {row.measures}
                                            </p>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="min-h-[5rem] rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-foreground shadow-sm">
                                                {row.accountable || '—'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
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
                            setCurrentStep((step) =>
                                Math.min(sections.length - 1, step + 1),
                            )
                        }
                        disabled={currentStep === sections.length - 1}
                    >
                        Next
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
