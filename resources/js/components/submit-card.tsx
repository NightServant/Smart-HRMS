import { router, usePage } from "@inertiajs/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User } from "@/types";

export default function SubmitCard() {
    const { auth } = usePage<{ auth: { user: User & { employee_id?: string } } }>().props;
    const [period, setPeriod] = useState("");
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (): void => {
        if (!period || !auth.user.employee_id) return;
        setProcessing(true);
        router.post(
            "/ipcr/submit",
            {
                employee_id: auth.user.employee_id,
                period,
            },
            {
                onFinish: () => setProcessing(false),
                onError: () => setProcessing(false),
            }
        );
    };

    return (
        <div className="mt-6 grid gap-6 animate-fade-in-up">
            <Card className='glass-card bg-card shadow-sm border border-border'>
                <CardHeader>
                    <CardTitle>Evaluation Form Details</CardTitle>
                    <CardDescription>Select the appropriate semester before submitting the evaluation form.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="employee-name">Employee Name</Label>
                            <Input id="employee-name" value={auth.user.name} readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="period">Evaluation Period</Label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger id="period">
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="s1">1st Semester</SelectItem>
                                    <SelectItem value="s2">2nd Semester</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 justify-end">
                        <Button
                            type="button"
                            className="px-6"
                            disabled={!period || !auth.user.employee_id || processing}
                            onClick={handleSubmit}
                        >
                            {processing ? "Submitting..." : "Submit Form"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
