import type { ComponentType } from 'react';

export type FieldType =
    | 'text'
    | 'textarea'
    | 'image'
    | 'select'
    | 'color'
    | 'number'
    | 'url'
    | 'toggle'
    | 'list';

export interface FieldOption {
    label: string;
    value: string;
}

export interface FieldDefinition {
    key: string;
    type: FieldType;
    label: string;
    options?: FieldOption[];
    fields?: FieldDefinition[];
}

export interface SectionRenderProps {
    data: Record<string, unknown>;
}

export interface VariantDefinition {
    label: string;
    render: ComponentType<SectionRenderProps>;
}

export interface SectionDefinition {
    type: string;
    label: string;
    defaults: Record<string, unknown>;
    fields: FieldDefinition[];
    variants: Record<string, VariantDefinition>;
    defaultVariant: string;
}
