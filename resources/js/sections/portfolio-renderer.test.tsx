import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PortfolioDocument } from '@/types/document';
import { PortfolioRenderer } from './portfolio-renderer';

function doc(overrides: Partial<PortfolioDocument>): PortfolioDocument {
    return {
        version: 1,
        theme: 'minimal',
        template: 'blank',
        meta: { title: '', description: '' },
        sections: [],
        ...overrides,
    };
}

describe('PortfolioRenderer', () => {
    it('sets the theme attribute from the document', () => {
        const { container } = render(<PortfolioRenderer document={doc({ theme: 'dark' })} />);
        expect(container.querySelector('[data-pf-theme="dark"]')).not.toBeNull();
    });

    it('does not render hidden sections', () => {
        render(
            <PortfolioRenderer
                document={doc({
                    sections: [
                        { id: 'a', type: 'about', variant: 'centered', visible: false, data: { name: 'Hidden' } },
                        { id: 'b', type: 'about', variant: 'centered', visible: true, data: { name: 'Shown' } },
                    ],
                })}
            />,
        );
        expect(screen.queryByText('Hidden')).toBeNull();
        expect(screen.getByText('Shown')).toBeDefined();
    });
});
