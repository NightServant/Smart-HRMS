import { dashboard, home, login, performanceDashboard, register } from '@/routes';
import { BrainCircuit, LayoutDashboard, LogIn, Sparkles, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as admin from '@/routes/admin';
import { Link, usePage } from '@inertiajs/react';
import type { User } from '@/types';

type TiltState = {
    spinX: number;
    spinY: number;
    glowX: number;
    glowY: number;
};

const defaultTilt: TiltState = {
    spinX: -8,
    spinY: 0,
    glowX: 50,
    glowY: 50,
};

const logoSideDepthLayers = Array.from({ length: 16 }, (_, index) => 44 + index * 1.6);

export default function HomepageSection() {
    const { auth, canRegister } = usePage<{ auth: { user: User | null }; canRegister?: boolean }>().props;
    const user = auth?.user ?? null;
    const registrationEnabled = canRegister ?? false;

    const dashboardLink = user?.role === 'hr-personnel'
        ? admin.performanceDashboard()
        : user?.role === 'evaluator'
            ? performanceDashboard()
            : dashboard();

    const [tilt, setTilt] = useState<TiltState>(defaultTilt);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const lastPointer = useRef<{ x: number; y: number } | null>(null);
    const spinVelocityY = useRef<number>(0);

    const logoStackStyle = useMemo(
        () => ({
            transform: `rotateX(${tilt.spinX}deg) rotateY(${tilt.spinY}deg)`,
            transition: 'transform 120ms ease-out',
        }),
        [tilt.spinX, tilt.spinY],
    );

    const glowStyle = useMemo(
        () => ({
            background: `radial-gradient(circle at ${tilt.glowX}% ${tilt.glowY}%, rgb(145 195 131 / 0.45), rgb(74 124 60 / 0.08) 38%, transparent 70%)`,
        }),
        [tilt.glowX, tilt.glowY],
    );

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setTilt((current) => {
            if (!isDragging || !lastPointer.current) {
                return {
                    ...current,
                    glowX: (x / rect.width) * 100,
                    glowY: (y / rect.height) * 100,
                };
            }

            const deltaX = event.clientX - lastPointer.current.x;
            const deltaY = event.clientY - lastPointer.current.y;
            lastPointer.current = { x: event.clientX, y: event.clientY };
            spinVelocityY.current = deltaX * 0.16;

            return {
                spinX: Math.max(-35, Math.min(35, current.spinX - deltaY * 0.25)),
                spinY: current.spinY + deltaX * 0.55,
                glowX: (x / rect.width) * 100,
                glowY: (y / rect.height) * 100,
            };
        });
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        setIsDragging(true);
        spinVelocityY.current = 0;
        lastPointer.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
        setIsDragging(false);
        lastPointer.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const handlePointerLeave = (): void => {
        setIsDragging(false);
        lastPointer.current = null;
    };

    useEffect(() => {
        let frameId = 0;

        const loop = (): void => {
            if (!isDragging) {
                setTilt((current) => {
                    const nextVelocity = Math.abs(spinVelocityY.current) > 0.005 ? spinVelocityY.current : 0;
                    const idleDrift = nextVelocity === 0 ? 0.2 : nextVelocity;
                    spinVelocityY.current = nextVelocity * 0.95;

                    return {
                        ...current,
                        spinX: current.spinX + (defaultTilt.spinX - current.spinX) * 0.03,
                        spinY: current.spinY + idleDrift,
                    };
                });
            }

            frameId = window.requestAnimationFrame(loop);
        };

        frameId = window.requestAnimationFrame(loop);

        return (): void => {
            window.cancelAnimationFrame(frameId);
        };
    }, [isDragging]);

    return (
        <section className="bg-video relative flex h-auto w-full overflow-x-hidden px-0 pb-16 pt-28 md:pb-20 md:pt-32">
            <video
                className="bg-video__media"
                autoPlay
                muted
                loop
                playsInline
            >
                <source src="/videos/background-video.mp4" type="video/mp4" />
            </video>
            <div className="bg-video__overlay" />
            <div className="bg-video__content relative mx-auto grid w-full max-w-[1500px] grid-cols-1 items-center gap-10 px-6 md:px-10 xl:grid-cols-12">
                <div className="xl:col-span-6">
                    <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/75 dark:bg-background/75 px-4 py-1 text-sm font-semibold text-white dark:text-primary">
                        <Sparkles className="size-4" />
                        Algorithmic Decision Support
                    </span>
                    <h1 className="animate-fade-in-down mx-auto w-full max-w-4xl py-4 text-center text-4xl font-bold tracking-tight sm:text-5xl xl:mx-0 xl:text-left xl:text-6xl">
                        Smart Human Resource Management System
                    </h1>
                    <p className="animate-fade-in-down mx-auto text-primary flex max-w-2xl items-start gap-2 pb-2 pt-4 text-center text-lg font-bold text-primary md:text-xl xl:mx-0 xl:text-left">
                        <BrainCircuit className="mt-1 hidden size-6 shrink-0 md:block" />
                        Streamline your HR processes with our comprehensive Human Resource Management System powered by
                        algorithmic approaches.
                    </p>
                    <div className="animate-fade-in-down mx-auto my-6 flex w-full flex-col items-center justify-center gap-3 text-center sm:w-auto sm:flex-row sm:flex-wrap xl:items-start xl:justify-start xl:text-left">
                        {user ? (
                            <Link
                                href={dashboardLink}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors duration-300 hover:bg-primary/90 sm:w-auto sm:min-w-[10rem] sm:text-base"
                            >
                                <LayoutDashboard className="size-4" />
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-flex w-full animate-fade-in-right items-center justify-center gap-2 rounded-md border-2 border-primary bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors duration-300 ease-in-out hover:bg-primary hover:text-primary-foreground sm:w-auto sm:min-w-[10rem] sm:text-base"
                                >
                                    <LogIn className="size-4" />
                                    Login
                                </Link>
                                {registrationEnabled && (
                                    <Link
                                        href={register()}
                                        className="inline-flex w-full animate-fade-in-right items-center justify-center gap-2 rounded-md border-2 border-primary-foreground bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors duration-300 ease-in-out hover:bg-primary/90 sm:w-auto sm:min-w-[10rem] sm:text-base"
                                    >
                                        <UserPlus className="size-4" />
                                        Register
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-6">
                    <div className="mx-auto max-w-[40rem] [perspective:1400px]">
                        <div
                            className="group relative mx-auto aspect-square w-full max-w-[34rem] animate-float-calm cursor-grab active:cursor-grabbing"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                        >
                            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-secondary/15 to-transparent blur-3xl" />

                            <div className="relative h-full w-full [transform-style:preserve-3d]">
                                <div
                                    className="relative h-full w-full [transform-style:preserve-3d]"
                                    style={logoStackStyle}
                                >
                                    <div className="pointer-events-none absolute inset-[8%] rounded-full" style={glowStyle} />
                                    {logoSideDepthLayers.map((depth) => (
                                        <div
                                            key={depth}
                                            className="pointer-events-none absolute inset-[20%] rounded-full border border-white/80 bg-white"
                                            style={{ transform: `translateZ(${depth}px)` }}
                                        />
                                    ))}

                                    <div className="pointer-events-none absolute inset-[20%] overflow-hidden rounded-full border border-white/70 bg-background/85 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.45)] [backface-visibility:hidden] [transform:translateZ(44px)_rotateY(180deg)]">
                                        <img
                                            src="/images/SHRMS.png"
                                            alt="Smart Human Resource Management System visual back face"
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent" />
                                    </div>

                                    <div className="absolute inset-[20%] overflow-hidden rounded-full border border-white/70 bg-background/85 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.65)] [transform:translateZ(70px)]">
                                        <img
                                            src="/images/SHRMS.png"
                                            alt="Smart Human Resource Management System visual"
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
