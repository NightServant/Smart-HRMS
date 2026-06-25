import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square rounded-full size-8 items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
                <AppLogoIcon className="size-8 fill-current" />
            </div>
            <div className="ml-1 grid text-left text-sm">
                <span className="mb-0.5 leading-tight font-semibold">
                    Smart HRMS
                </span>
            </div>
        </>
    );
}
