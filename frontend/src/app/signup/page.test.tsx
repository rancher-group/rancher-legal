import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "./page";
import { isAllowedSignupEmail } from "@/app/components/auth/signupDomain";

const { signup, refreshSession, replace, push } = vi.hoisted(() => ({
    signup: vi.fn(),
    refreshSession: vi.fn(),
    replace: vi.fn(),
    push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace, push }),
}));

vi.mock("@/app/lib/authApi", () => ({ signup }));

vi.mock("@/app/contexts/AuthContext", () => ({
    useAuth: () => ({
        isAuthenticated: false,
        authLoading: false,
        refreshSession,
    }),
}));

vi.mock("@/app/components/site-logo", () => ({
    SiteLogo: () => <div>Rancher</div>,
}));

async function fillAndSubmit(email: string, password = "long-password") {
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText("Work email"), email);
    await user.type(screen.getByLabelText("Password"), password);
    await user.type(screen.getByLabelText("Confirm password"), password);
    await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("isAllowedSignupEmail", () => {
    it.each([
        ["new@gorancher.com", true],
        ["  New+tag@GoRancher.COM ", true],
        ["new@example.com", false],
        ["new@gorancher.com.evil.com", false],
        ["new@mail.gorancher.com", false],
        ["new@evilgorancher.com", false],
        ["@gorancher.com", false],
    ])("%s -> %s", (email, expected) => {
        expect(isAllowedSignupEmail(email)).toBe(expected);
    });
});

describe("SignupPage", () => {
    beforeEach(() => {
        signup.mockReset();
        refreshSession.mockReset();
        replace.mockReset();
        push.mockReset();
    });

    it("tells visitors that signup is for Rancher team members", () => {
        render(<SignupPage />);
        expect(
            screen.getByText(
                "Rancher team members only — use your @gorancher.com email.",
            ),
        ).toBeInTheDocument();
    });

    it("submits an allowed address and sends the user to check their email", async () => {
        signup.mockResolvedValue({
            user: { id: "user-1" },
            requiresEmailConfirmation: true,
        });
        await fillAndSubmit("New@GoRancher.com");

        expect(signup).toHaveBeenCalledExactlyOnceWith(
            "New@GoRancher.com",
            "long-password",
            "/onboarding/profile",
        );
        expect(push).toHaveBeenCalledWith("/signup/check-email");
    });

    it.each([
        "someone@example.com",
        "someone@gorancher.com.evil.com",
        "someone@mail.gorancher.com",
    ])("blocks %s client-side with an error tied to the email field", async (email) => {
        await fillAndSubmit(email);

        const input = screen.getByLabelText("Work email");
        expect(signup).not.toHaveBeenCalled();
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription(
            "Use your @gorancher.com email address.",
        );
    });

    it("shows the server's domain rejection on the email field", async () => {
        signup.mockRejectedValue(
            Object.assign(new Error("nope"), {
                code: "signup_domain_not_allowed",
            }),
        );
        await fillAndSubmit("someone@gorancher.com");

        expect(screen.getByLabelText("Work email")).toHaveAccessibleDescription(
            "Use your @gorancher.com email address.",
        );
    });

    it("shows a form-level message when signup is disabled server-side", async () => {
        signup.mockRejectedValue(
            Object.assign(new Error("closed"), { code: "signup_disabled" }),
        );
        await fillAndSubmit("someone@gorancher.com");

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Self-service signup is currently disabled.",
        );
    });

    it("ties a short-password error to the password field", async () => {
        await fillAndSubmit("someone@gorancher.com", "short");

        const input = screen.getByLabelText("Password");
        expect(signup).not.toHaveBeenCalled();
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription(
            "At least 10 characters. Password must be at least 10 characters",
        );
    });
});
