import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appFile = (name: string) => readFileSync(resolve(process.cwd(), "src/app", name), "utf8");
describe("Rancher brand boundary", () => {
    it("uses the Rancher origin without loading remote fonts or legacy branding", () => {
        const layout = appFile("layout.tsx");
        expect(layout).toContain("https://legal.gorancher.com");
        expect(layout).toContain("Rancher Legal");
        expect(layout).not.toMatch(/next\/font\/google|growthcast/i);
        const logo = appFile("components/site-logo.tsx");
        expect(logo).toContain('viewBox="0 0 32 34"');
        expect(logo).toContain("M3 29V6l13-4 13 4v23");
        expect(logo).toContain("rancher</span>");
        expect(logo).toContain("https://www.gorancher.com");
    });
    it("shares homepage tokens and native fonts with a distinct document canvas", () => {
        const globals = appFile("globals.css");
        for (const token of ["#193e34", "#536059", "#f7f6ee", "#d9dfd3", "#fffef7"]) {
            expect(globals).toContain(token);
        }
        expect(globals).toContain("Arial, Helvetica, sans-serif");
        expect(globals).toContain("Georgia");
        expect(appFile("rancher-theme.css")).toContain("--document-canvas-background: #f0f2e8");
    });
});
