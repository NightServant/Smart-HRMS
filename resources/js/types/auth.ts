export type User = {
    id: number;
    name: string;
    email: string;
    role: 'employee' | 'evaluator' | 'hr-personnel' | 'pmt';
    employee_id?: string | null;
    position?: string | null;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    is_active?: boolean;
    must_change_password?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
