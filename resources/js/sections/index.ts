import type { SectionDefinition } from '@/types/section';
import { aboutSection } from './about';

export const sectionRegistry: Record<string, SectionDefinition> = {
    [aboutSection.type]: aboutSection,
};

export const sectionList: SectionDefinition[] = Object.values(sectionRegistry);

export function getSectionDefinition(type: string): SectionDefinition | undefined {
    return sectionRegistry[type];
}
