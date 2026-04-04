import { Send } from "lucide-react";

export default function SubmitHeader() {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="animate-fade-in-down">
                <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                    <Send className="h-8 w-8" />
                    IPCR Evaluation Form
                </h1>
                <p className="mt-1 text-muted-foreground">Prepare your paper-form IPCR, track its workflow, and respond during the appeal window when needed.</p>
            </div>
        </div>
    );
}
