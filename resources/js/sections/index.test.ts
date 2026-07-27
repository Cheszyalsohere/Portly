import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { getSectionDefinition, sectionList, sectionRegistry } from './index';

describe('section registry', () => {
    it('registers the about section', () => {
        expect(getSectionDefinition('about')).toBeDefined();
    });

    it('returns undefined for an unknown type', () => {
        expect(getSectionDefinition('nope')).toBeUndefined();
    });

    it('is not empty', () => {
        expect(sectionList.length).toBeGreaterThan(0);
        expect(Object.keys(sectionRegistry)).toEqual(sectionList.map((d) => d.type));
    });
});

describe('every section definition is internally consistent', () => {
    it.each(sectionList.map((d) => [d.type, d] as const))(
        '%s has complete defaults, a valid defaultVariant, and renderable variants',
        (_type, def) => {
            for (const field of def.fields) {
                expect(Object.keys(def.defaults)).toContain(field.key);
            }
            expect(Object.keys(def.variants)).toContain(def.defaultVariant);
            for (const variant of Object.values(def.variants)) {
                expect(() =>
                    render(createElement(variant.render, { data: def.defaults })),
                ).not.toThrow();
            }
        },
    );
});
