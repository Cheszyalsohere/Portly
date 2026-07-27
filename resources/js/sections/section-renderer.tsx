import type { SectionInstance } from '@/types/document';
import { getSectionDefinition } from './index';

export function SectionRenderer({ section }: { section: SectionInstance }) {
    const def = getSectionDefinition(section.type);

    if (!def) {
        return (
            <section className="pf-section" data-section-type={section.type}>
                <div className="pf-section-inner pf-body">
                    Unknown section: {section.type}
                </div>
            </section>
        );
    }

    const variant = def.variants[section.variant] ?? def.variants[def.defaultVariant];
    const Render = variant.render;

    return (
        <section className="pf-section" data-section-type={section.type}>
            <Render data={section.data} />
        </section>
    );
}
