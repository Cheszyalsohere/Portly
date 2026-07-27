import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SectionInstance } from '@/types/document';
import { SectionRenderer } from './section-renderer';

function instance(overrides: Partial<SectionInstance>): SectionInstance {
    return {
        id: 's_1',
        type: 'about',
        variant: 'image-left',
        visible: true,
        data: { name: 'Irfan' },
        ...overrides,
    };
}

describe('SectionRenderer', () => {
    it('renders the chosen variant', () => {
        render(<SectionRenderer section={instance({ variant: 'centered' })} />);
        expect(screen.getByText('Irfan')).toBeDefined();
    });

    it('falls back to the default variant when the variant is unknown', () => {
        render(<SectionRenderer section={instance({ variant: 'does-not-exist' })} />);
        expect(screen.getByText('Irfan')).toBeDefined();
    });

    it('shows a placeholder for an unknown section type', () => {
        render(<SectionRenderer section={instance({ type: 'ghost' })} />);
        expect(screen.getByText(/unknown section/i)).toBeDefined();
    });
});
