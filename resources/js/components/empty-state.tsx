import type { ReactNode } from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-12 text-center">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}
