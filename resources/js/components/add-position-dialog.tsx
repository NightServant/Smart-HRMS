import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const ROLE_OPTIONS = [
    { value: 'employee', label: 'Employee' },
    { value: 'evaluator', label: 'Evaluator' },
    { value: 'pmt', label: 'PMT' },
];

export function AddPositionDialog({
    open,
    onOpenChange,
    departmentId,
    departmentName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    departmentId: number | null;
    departmentName: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        department_id: departmentId ? String(departmentId) : '',
        linked_role: 'employee',
    });

    useEffect(() => {
        if (open && departmentId) {
            setData('department_id', String(departmentId));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, departmentId]);

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            reset();
        }
        onOpenChange(nextOpen);
    };

    const handleSubmit = (event: FormEvent): void => {
        event.preventDefault();
        post('/admin/positions', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Position</DialogTitle>
                    <DialogDescription>
                        Create a new position for{' '}
                        <span className="font-semibold">{departmentName}</span>.
                        Choose the linked account role for employees who will
                        hold this position.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="add-position-name">Position Name</Label>
                        <Input
                            id="add-position-name"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            placeholder="e.g. Senior Analyst"
                            autoFocus
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="add-position-role">
                            Linked Account Role
                        </Label>
                        <Select
                            value={data.linked_role}
                            onValueChange={(value) =>
                                setData('linked_role', value)
                            }
                        >
                            <SelectTrigger id="add-position-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {ROLE_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        {errors.linked_role && (
                            <p className="text-xs text-destructive">
                                {errors.linked_role}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Adding...' : 'Add Position'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
