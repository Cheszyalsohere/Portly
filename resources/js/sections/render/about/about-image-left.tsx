import type { SectionRenderProps } from '@/types/section';
import { toAboutData } from '@/sections/about';

export function AboutImageLeft({ data }: SectionRenderProps) {
    const about = toAboutData(data);

    return (
        <div className="pf-section-inner flex flex-col items-center gap-8 md:flex-row">
            <div className="pf-media aspect-square w-40 shrink-0 md:w-56">
                {about.photo ? (
                    <img
                        src={`/storage/${about.photo}`}
                        alt={about.name}
                        className="h-full w-full rounded-[inherit] object-cover"
                    />
                ) : null}
            </div>
            <div className="flex flex-col gap-3 text-center md:text-left">
                <h2 className="pf-heading text-3xl md:text-4xl">{about.name}</h2>
                <p className="pf-subheading text-lg">{about.title}</p>
                {about.bio ? <p className="pf-body max-w-prose">{about.bio}</p> : null}
            </div>
        </div>
    );
}
