import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { submitEvaluation } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import SubmitHeader from '@/components/submit-header';
import SubmitCard from '@/components/submit-card';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Submit Evaluation',
        href: submitEvaluation().url,
    },
];

export default function SubmitEvaluation() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Submit Evaluation" />
            <div className="app-page-shell app-page-stack pb-10">
                <SubmitHeader />
                <SubmitCard />
            </div>
        </AppLayout>
    );
}
