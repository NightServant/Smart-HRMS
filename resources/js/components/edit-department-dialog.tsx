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

export function EditDepartmentDialog({
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
    const { data, setData, put, processing, errors, reset } = useForm({
        name: departmentName,
    });

    useEffect(() => {
        if (open) {
            setData('name', departmentName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, departmentName]);

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            reset();
        }
        onOpenChange(nextOpen);
    };

    const handleSubmit = (event: FormEvent): void => {
        event.preventDefault();

        if (departmentId === null) {
            return;
        }

        put(`/admin/departments/${departmentId}`, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Department</DialogTitle>
                    <DialogDescription>
                        Rename this department. The new name will sync to the
                        ZKTeco Zlink directory automatically.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="edit-department-name">
                            Department Name
                        </Label>
                        <Input
                            id="edit-department-name"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            autoFocus
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name}
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
                        <Button
                            type="submit"
                            disabled={processing || departmentId === null}
                        >
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
