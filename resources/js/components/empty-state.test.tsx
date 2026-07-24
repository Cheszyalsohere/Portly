import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
    it('renders the title and description', () => {
        render(<EmptyState title="No portfolios yet" description="Nothing here." />);

        expect(screen.getByText('No portfolios yet')).toBeDefined();
        expect(screen.getByText('Nothing here.')).toBeDefined();
    });

    it('renders an action when one is given', () => {
        render(
            <EmptyState
                title="No portfolios yet"
                description="Nothing here."
                action={<button>New portfolio</button>}
            />,
        );

        expect(screen.getByRole('button', { name: 'New portfolio' })).toBeDefined();
    });

    it('renders no action when none is given', () => {
        render(<EmptyState title="No portfolios yet" description="Nothing here." />);

        expect(screen.queryByRole('button')).toBeNull();
    });
});
