import type { SectionDefinition } from '@/types/section';
import { AboutCentered } from './render/about/about-centered';
import { AboutImageLeft } from './render/about/about-image-left';

export interface AboutData {
    name: string;
    title: string;
    bio: string;
    photo: string | null;
}

const defaults: AboutData = {
    name: 'Your Name',
    title: 'Your Title',
    bio: '',
    photo: null,
};

export function toAboutData(raw: Record<string, unknown>): AboutData {
    return {
        name: typeof raw.name === 'string' ? raw.name : defaults.name,
        title: typeof raw.title === 'string' ? raw.title : defaults.title,
        bio: typeof raw.bio === 'string' ? raw.bio : defaults.bio,
        photo: typeof raw.photo === 'string' ? raw.photo : null,
    };
}

export const aboutSection: SectionDefinition = {
    type: 'about',
    label: 'About',
    defaults: { ...defaults },
    fields: [
        { key: 'name', type: 'text', label: 'Name' },
        { key: 'title', type: 'text', label: 'Job Title' },
        { key: 'bio', type: 'textarea', label: 'Description' },
        { key: 'photo', type: 'image', label: 'Profile Picture' },
    ],
    variants: {
        'image-left': { label: 'Image Left', render: AboutImageLeft },
        centered: { label: 'Centered', render: AboutCentered },
    },
    defaultVariant: 'image-left',
};
