import { Head } from '@inertiajs/react';
import { EmptyState } from '@/components/empty-state';
import { dashboard } from '@/routes';

interface PortfolioSummary {
    id: number;
    title: string;
    slug: string | null;
    updated_at: string;
}

interface DashboardProps {
    portfolios: PortfolioSummary[];
}

export default function Dashboard({ portfolios }: DashboardProps) {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4">
                <h1 className="text-2xl font-semibold">My Portfolios</h1>

                {portfolios.length === 0 ? (
                    <EmptyState
                        title="No portfolios yet"
                        description="Your portfolios will appear here once you create one."
                    />
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {portfolios.map((portfolio) => (
                            <li
                                key={portfolio.id}
                                className="rounded-xl border p-4"
                            >
                                <p className="font-medium">{portfolio.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {portfolio.slug ?? 'Draft'}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
