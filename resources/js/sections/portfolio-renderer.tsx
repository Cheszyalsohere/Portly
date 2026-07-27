import type { PortfolioDocument } from '@/types/document';
import { SectionRenderer } from './section-renderer';

export function PortfolioRenderer({ document }: { document: PortfolioDocument }) {
    const visible = document.sections.filter((section) => section.visible);

    return (
        <div className="pf-root" data-pf-theme={document.theme}>
            {visible.map((section) => (
                <SectionRenderer key={section.id} section={section} />
            ))}
        </div>
    );
}
