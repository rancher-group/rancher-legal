import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "./page";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

describe("SignupPage invitation-only gate", () => {
    beforeEach(() => redirect.mockReset());

    it("redirects anonymous signup to login rather than offering registration", () => {
        SignupPage();
        expect(redirect).toHaveBeenCalledExactlyOnceWith("/login");
    });
});
