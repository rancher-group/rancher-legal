import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/app/components/providers";

export const metadata: Metadata = {
    metadataBase: new URL("https://legal.gorancher.com"),
    title: "Rancher Legal | Powered by Mike",
    description:
        "Private AI-powered legal document analysis and contract review for Rancher.",
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
    icons: {
        icon: [
            {
                url: "/rancher-logo.svg",
                type: "image/svg+xml",
            },
        ],
        apple: "/rancher-logo.svg",
    },
    openGraph: {
        type: "website",
        url: "https://legal.gorancher.com",
        siteName: "Rancher Legal",
        title: "Rancher Legal | Powered by Mike",
        description:
            "Private AI-powered legal document analysis and contract review for Rancher.",
    },
    twitter: {
        card: "summary_large_image",
        title: "Rancher Legal | Powered by Mike",
        description:
            "Private AI-powered legal document analysis and contract review for Rancher.",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className="font-sans antialiased"
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
