export type IpcrRatingSet = {
    quality: number | null;
    efficiency: number | null;
    timeliness: number | null;
};

export type IpcrSelfAssessmentQetaSet = {
    quality: number | null;
    efficiency: number | null;
    timeliness: number | null;
    accountability: number | null;
};

export type IpcrFormRow = {
    id: string;
    target: string;
    target_details: string | null;
    measures: string;
    accountable: string;
    actual_accomplishment: string;
    ratings: IpcrRatingSet;
    self_assessment_qeta_scores?: IpcrSelfAssessmentQetaSet;
    self_assessment_qeta_average?: number | null;
    average: number | null;
    remarks: string;
};

export type IpcrFormSection = {
    id: string;
    title: string;
    rows: IpcrFormRow[];
};

export type IpcrFormPayload = {
    template_version: string;
    metadata: {
        country?: string | null;
        organization?: string | null;
        city?: string | null;
        department?: string | null;
        form_title?: string | null;
        period?: string | null;
        employee_name?: string | null;
        employee_position?: string | null;
    };
    sections: IpcrFormSection[];
    workflow_notes: {
        employee_notes?: string;
        self_assessment_qeta?: string;
        self_assessment_qeta_scores?: IpcrSelfAssessmentQetaSet;
        evaluator_remarks?: string;
        hr_remarks?: string;
        pmt_remarks?: string;
        appeal_reason?: string;
    };
    summary: {
        computed_rating: number | null;
        rated_rows: number;
        adjectival_rating: string | null;
    };
    sign_off: {
        ratee_name?: string | null;
        reviewed_by_name?: string | null;
        pmt_chair_name?: string | null;
        final_rater_name?: string | null;
        head_of_agency_name?: string | null;
        ratee_date?: string | null;
        reviewed_by_date?: string | null;
        pmt_date?: string | null;
        finalized_date?: string | null;
    };
    finalization: {
        final_rating: number | null;
        adjectival_rating: string | null;
        finalized_at?: string | null;
    };
};

export type IpcrTarget = {
    id: number;
    employee_id: string;
    semester: 1 | 2;
    target_year: number;
    form_payload: IpcrFormPayload | null;
    status: 'draft' | 'submitted';
    submitted_at: string | null;
    evaluator_id: string | null;
    evaluator_decision: 'approved' | 'rejected' | null;
    evaluator_remarks: string | null;
    evaluator_reviewed_at: string | null;
    hr_finalized: boolean;
    employee: IpcrEmployee | null;
    evaluator: IpcrEmployee | null;
};

export type IpcrTargetPeriod = {
    semester: 1 | 2;
    year: number;
    label: string;
    submissionOpen: boolean;
    submissionWindowLabel: string;
};

export type IpcrAppeal = {
    id: number;
    appeal_reason: string;
    appeal_evidence_description: string | null;
    evidence_files: string[];
    status: string | null;
};

export type IpcrEmployee = {
    employee_id: string;
    name: string;
    job_title: string;
    supervisor_id?: string | null;
};

export type IpcrSubmission = {
    id: number;
    employee_id: string;
    performance_rating: number | null;
    criteria_ratings: Record<string, string> | null;
    form_payload: IpcrFormPayload;
    status: string | null;
    stage: string | null;
    routing_action: string | null;
    evaluator_gave_remarks: boolean;
    remarks: string | null;
    notification: string | null;
    hr_decision: string | null;
    hr_remarks: string | null;
    pmt_decision: string | null;
    pmt_remarks: string | null;
    hr_cycle_count: number;
    pmt_cycle_count: number;
    appeal_status: string | null;
    appeal_count: number;
    appeal_window_opens_at: string | null;
    appeal_window_closes_at: string | null;
    final_rating: number | null;
    adjectival_rating: string | null;
    finalized_at: string | null;
    is_escalated: boolean;
    escalation_reason: string | null;
    created_at: string | null;
    updated_at: string | null;
    appeal_url: string | null;
    employee: IpcrEmployee | null;
    evaluator: IpcrEmployee | null;
    hr_reviewer: IpcrEmployee | null;
    pmt_reviewer: IpcrEmployee | null;
    appeal: IpcrAppeal | null;
};
