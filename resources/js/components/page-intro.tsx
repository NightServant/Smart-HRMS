import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
    contentClassName?: string;
};

export default function PageIntro({
    eyebrow,
    title,
    description,
    actions,
    className,
    contentClassName,
}: Props) {
    return (
        <section className={cn('glass-card app-page-intro', className)}>
            <div className={cn('app-page-intro__content', contentClassName)}>
                {eyebrow ? (
                    <p className="app-page-intro__eyebrow">{eyebrow}</p>
                ) : null}
                <div className="space-y-2">
                    <h1 className="app-page-intro__title text-foreground">
                        {title}
                    </h1>
                    {description ? (
                        <p className="app-page-intro__description">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? (
                    <div className="app-page-intro__actions">{actions}</div>
                ) : null}
            </div>
        </section>
    );
}
