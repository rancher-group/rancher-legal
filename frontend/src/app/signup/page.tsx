"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/app/lib/authApi";
import { Input } from "@/app/components/ui/input";
import { PillButtonUI } from "@/shared/ui/PillButtonUI";
import { SiteLogo } from "@/app/components/site-logo";
import { useAuth } from "@/app/contexts/AuthContext";
import { cn } from "@/app/lib/utils";
import {
    authGlassCardClassName,
    authInputClassName,
} from "@/app/components/auth/authStyles";
import { FieldLabel } from "@/app/components/ui/form-field";
import { errorCode, knownErrorCodeMessage } from "@/app/lib/userFacingError";
import {
    MIN_PASSWORD_LENGTH,
    minimumPasswordMessage,
} from "@/app/components/auth/passwordPolicy";
import {
    SIGNUP_EMAIL_DOMAIN,
    isAllowedSignupEmail,
    signupDomainMessage,
} from "@/app/components/auth/signupDomain";

const SIGNUP_ERROR_MESSAGES = {
    signup_domain_not_allowed: signupDomainMessage,
    signup_disabled: "Self-service signup is currently disabled.",
    user_already_exists: "An account with this email already exists.",
    email_exists: "An account with this email already exists.",
    over_email_send_rate_limit:
        "Too many signup emails were requested. Please wait and try again.",
    weak_password: "Choose a stronger password and try again.",
} as const;

type Field = "email" | "password" | "confirmPassword" | "form";

export default function SignupPage() {
    const router = useRouter();
    const { isAuthenticated, authLoading, refreshSession } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<{
        field: Field;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace("/onboarding/profile");
        }
    }, [authLoading, isAuthenticated, router]);

    const errorFor = (field: Field) =>
        error?.field === field ? error.message : null;
    const fieldProps = (field: Exclude<Field, "form">, hintId?: string) => {
        const invalid = error?.field === field;
        const describedBy = [hintId, invalid ? `${field}-error` : null]
            .filter(Boolean)
            .join(" ");
        return {
            "aria-invalid": invalid || undefined,
            "aria-describedby": describedBy || undefined,
        };
    };
    const fieldError = (field: Exclude<Field, "form">) => {
        const message = errorFor(field);
        return message ? (
            <p
                id={`${field}-error`}
                role="alert"
                className="mt-1.5 text-sm text-red-600"
            >
                {message}
            </p>
        ) : null;
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedEmail = email.trim();
        if (!isAllowedSignupEmail(trimmedEmail)) {
            setError({ field: "email", message: signupDomainMessage });
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError({ field: "password", message: minimumPasswordMessage });
            return;
        }
        if (password !== confirmPassword) {
            setError({
                field: "confirmPassword",
                message: "Passwords do not match",
            });
            return;
        }

        setLoading(true);
        try {
            const result = await signup(
                trimmedEmail,
                password,
                "/onboarding/profile",
            );
            if (result.requiresEmailConfirmation) {
                router.push("/signup/check-email");
            } else {
                await refreshSession();
                router.push("/onboarding/profile");
            }
        } catch (err: unknown) {
            setError({
                field:
                    errorCode(err) === "signup_domain_not_allowed"
                        ? "email"
                        : "form",
                message: knownErrorCodeMessage(
                    err,
                    SIGNUP_ERROR_MESSAGES,
                    "Unable to create your account right now. Please try again.",
                ),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-dvh items-center justify-center bg-gray-50/80 px-6 pb-10 pt-28">
            <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2">
                <SiteLogo size="lg" asLink />
            </div>
            <div className="w-full max-w-md">
                <div className={cn(authGlassCardClassName, "mb-4")}>
                    <h1 className="mb-2 text-left text-2xl font-medium font-serif text-gray-950">
                        Create account
                    </h1>
                    <p className="mb-6 text-sm text-gray-600">
                        Rancher team members only — use your @
                        {SIGNUP_EMAIL_DOMAIN} email.
                    </p>

                    <form
                        onSubmit={handleSignup}
                        className="space-y-4"
                        noValidate
                    >
                        <div>
                            <FieldLabel htmlFor="email">Work email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder={`you@${SIGNUP_EMAIL_DOMAIN}`}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                {...fieldProps("email")}
                                className={`w-full ${authInputClassName}`}
                            />
                            {fieldError("email")}
                        </div>

                        <div>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                {...fieldProps("password", "password-hint")}
                                className={`w-full ${authInputClassName}`}
                            />
                            <p
                                id="password-hint"
                                className="mt-1.5 text-xs text-gray-500"
                            >
                                At least {MIN_PASSWORD_LENGTH} characters.
                            </p>
                            {fieldError("password")}
                        </div>

                        <div>
                            <FieldLabel htmlFor="confirmPassword">
                                Confirm password
                            </FieldLabel>
                            <Input
                                id="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                required
                                {...fieldProps("confirmPassword")}
                                className={`w-full ${authInputClassName}`}
                            />
                            {fieldError("confirmPassword")}
                        </div>

                        {errorFor("form") && (
                            <div
                                role="alert"
                                className="text-red-600 text-sm bg-red-50 p-3 rounded"
                            >
                                {errorFor("form")}
                            </div>
                        )}

                        <div className="pt-2">
                            <PillButtonUI
                                type="submit"
                                tone="black"
                                size="normal"
                                disabled={loading}
                                className="w-full"
                            >
                                {loading
                                    ? "Creating account..."
                                    : "Create account"}
                            </PillButtonUI>
                        </div>
                    </form>
                </div>
                <div className="text-center text-sm text-gray-500">
                    Have an account?{" "}
                    <Link
                        href="/login"
                        className="font-medium transition-colors hover:text-gray-950"
                    >
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    );
}
