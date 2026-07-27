import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aboutSection, toAboutData } from './about';

describe('toAboutData', () => {
    it('fills every field from defaults when raw is empty', () => {
        const data = toAboutData({});

        expect(data.name).toBe('Your Name');
        expect(data.title).toBe('Your Title');
        expect(data.bio).toBe('');
        expect(data.photo).toBeNull();
    });

    it('keeps provided values and coerces types', () => {
        const data = toAboutData({ name: 'Irfan', title: 'Dev', bio: 'hi', photo: 'media/x.jpg' });

        expect(data.name).toBe('Irfan');
        expect(data.photo).toBe('media/x.jpg');
    });
});

describe('about variants', () => {
    it('exposes image-left as the default variant', () => {
        expect(aboutSection.defaultVariant).toBe('image-left');
        expect(Object.keys(aboutSection.variants)).toContain('image-left');
        expect(Object.keys(aboutSection.variants)).toContain('centered');
    });

    it.each(Object.entries(aboutSection.variants))(
        'renders the %s variant with the name',
        (_key, variant) => {
            const Render = variant.render;
            render(<Render data={{ ...aboutSection.defaults, name: 'Irfan Nuha' }} />);
            expect(screen.getByText('Irfan Nuha')).toBeDefined();
        },
    );
});
