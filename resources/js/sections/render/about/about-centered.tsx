import type { SectionRenderProps } from '@/types/section';
import { toAboutData } from '@/sections/about';

export function AboutCentered({ data }: SectionRenderProps) {
    const about = toAboutData(data);

    return (
        <div className="pf-section-inner flex flex-col items-center gap-4 text-center">
            <div className="pf-media aspect-square w-32">
                {about.photo ? (
                    <img
                        src={`/storage/${about.photo}`}
                        alt={about.name}
                        className="h-full w-full rounded-[inherit] object-cover"
                    />
                ) : null}
            </div>
            <h2 className="pf-heading text-4xl">{about.name}</h2>
            <p className="pf-subheading text-lg">{about.title}</p>
            {about.bio ? <p className="pf-body max-w-prose">{about.bio}</p> : null}
        </div>
    );
}
