import Link from "next/link";

interface SiteLogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    iconClassName?: string;
    animate?: boolean;
    asLink?: boolean;
}

export function SiteLogo({
    size = "md",
    className = "",
    iconClassName = "",
    animate = false,
    asLink = false,
}: SiteLogoProps) {
    const sizeClasses = {
        sm: "w-36",
        md: "w-40",
        lg: "w-[180px]",
        xl: "w-[270px]",
    };
    const viewportClasses = {
        sm: "h-7",
        md: "h-8",
        lg: "h-8",
        xl: "h-12",
    };

    const logo = (
        <span
            className={`inline-flex shrink-0 flex-col ${sizeClasses[size]} ${
                animate ? "sidebar-fade-in" : ""
            } ${className}`}
        >
            <span
                className={`relative inline-block w-full overflow-hidden align-middle ${viewportClasses[size]} ${iconClassName}`}
            >
                <span className="inline-flex h-full items-center gap-2 text-foreground" role="img" aria-label="Rancher">
                    <svg viewBox="0 0 32 34" fill="none" aria-hidden="true" className="h-full w-auto">
                        <path d="M3 29V6l13-4 13 4v23M3 18l13-4 13 4M10 31V10m12 21V10M3 25l13-4 13 4" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                    </svg>
                    <span className="font-sans text-[26px] font-bold leading-none tracking-[-1.2px]">rancher</span>
                </span>
            </span>
            <span className="mt-0.5 text-right text-[10px] leading-none text-gray-500">
                Legal, powered by Mike
            </span>
        </span>
    );

    const sourceRevision = process.env.NEXT_PUBLIC_GIT_SHA;
    const sourceLink = (
        <a href={`https://github.com/rancher-group/rancher-legal${sourceRevision ? `/tree/${sourceRevision}` : ""}`}
            className="mt-1 text-xs underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            Source &amp; build instructions
        </a>
    );

    if (asLink) {
        return (
            <span className="inline-flex flex-col items-start">
            <Link
                href="https://www.gorancher.com"
                className="inline-flex cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
                {logo}
            </Link>
            {sourceLink}
            </span>
        );
    }

    return <span className="inline-flex flex-col items-start">{logo}{sourceLink}</span>;
}
