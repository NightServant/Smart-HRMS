import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { submitEvaluation } from '@/routes';
import * as ipcr from '@/routes/ipcr';
import type { BreadcrumbItem } from '@/types';
import SubmitCard from '@/components/submit-card';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'IPCR Submission',
        href: submitEvaluation().url,
    },
];

export default function SubmitEvaluation() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IPCR Submission" />
            <div className="app-page-shell app-page-stack pb-10">
                <Link
                    href={ipcr.target().url}
                    className="app-info-pill w-fit transition-colors duration-150 hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80"
                >
                    <ArrowLeft className="size-4" />
                    Back to IPCR Target
                </Link>
                <SubmitCard />
            </div>
        </AppLayout>
    );
}
