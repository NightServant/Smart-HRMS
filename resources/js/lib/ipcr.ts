import type {
    IpcrFormPayload,
    IpcrFormRow,
    IpcrFormSection,
    IpcrRatingSet,
} from '@/types/ipcr';

export function cloneIpcrFormPayload(payload: IpcrFormPayload): IpcrFormPayload {
    return JSON.parse(JSON.stringify(payload)) as IpcrFormPayload;
}

export function calculateIpcrRowAverage(ratings: IpcrRatingSet): number | null {
    const values = Object.values(ratings)
        .map((value) => (value === null || value === undefined ? null : Number(value)))
        .filter((value): value is number => value !== null && Number.isFinite(value));

    if (values.length === 0) {
        return null;
    }

    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function getAdjectivalRating(score: number | null): string | null {
    if (score === null || !Number.isFinite(score)) {
        return null;
    }

    if (score >= 4.71) {
        return 'Outstanding';
    }

    if (score >= 3.75) {
        return 'Very Outstanding';
    }

    if (score >= 3.0) {
        return 'Satisfactory';
    }

    if (score >= 2.01) {
        return 'Unsatisfactory';
    }

    return 'Poor';
}

export function recalculateIpcrFormPayload(payload: IpcrFormPayload): IpcrFormPayload {
    const next = cloneIpcrFormPayload(payload);
    const ratedRows: number[] = [];

    next.sections = next.sections.map((section: IpcrFormSection) => ({
        ...section,
        rows: section.rows.map((row: IpcrFormRow) => {
            const average = calculateIpcrRowAverage(row.ratings);

            if (average !== null) {
                ratedRows.push(average);
            }

            return {
                ...row,
                average,
            };
        }),
    }));

    next.summary.computed_rating = ratedRows.length > 0
        ? Number((ratedRows.reduce((sum, value) => sum + value, 0) / ratedRows.length).toFixed(2))
        : null;
    next.summary.rated_rows = ratedRows.length;
    next.summary.adjectival_rating = getAdjectivalRating(next.summary.computed_rating);

    const hasLockedFinalRating = Boolean(next.finalization.finalized_at)
        && next.finalization.final_rating !== null
        && Number.isFinite(next.finalization.final_rating);

    if (hasLockedFinalRating) {
        next.finalization.adjectival_rating = getAdjectivalRating(next.finalization.final_rating);
    } else {
        next.finalization.final_rating = next.summary.computed_rating;
        next.finalization.adjectival_rating = next.summary.adjectival_rating;
    }

    return next;
}

export function getFileName(path: string): string {
    return path.split('/').pop() ?? path;
}

export function getAppealEvidenceUrl(appealId: number, index: number): string {
    return `/ipcr/appeal/${appealId}/evidence/${index}?inline=1`;
}
