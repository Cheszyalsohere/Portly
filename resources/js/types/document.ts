export interface SectionInstance {
    id: string;
    type: string;
    variant: string;
    visible: boolean;
    data: Record<string, unknown>;
}

export interface PortfolioMeta {
    title: string;
    description: string;
}

export interface PortfolioDocument {
    version: number;
    theme: string;
    template: string;
    meta: PortfolioMeta;
    sections: SectionInstance[];
}
