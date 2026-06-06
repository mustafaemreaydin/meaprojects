"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { FeyButton } from "@/components/ui/fey-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password cannot be empty."),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const callbackUrl = params.get("callbackUrl");

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });
    if (res?.error) {
      setSubmitting(false);
      setServerError("Incorrect email or password.");
      return;
    }
    // Role-aware landing: admins → control panel, members → their tools.
    let dest = callbackUrl;
    if (!dest) {
      const session = await getSession();
      const role = (session?.user as { role?: string } | undefined)?.role;
      dest = role === "admin" ? "/dashboard" : "/apps";
    }
    setSubmitting(false);
    router.push(dest);
    router.refresh();
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && <p className="text-[13px] text-[var(--danger)]">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-[13px] text-[var(--danger)]">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-[13px] text-[var(--danger)]"
        >
          {serverError}
        </div>
      )}

      <FeyButton
        type="submit"
        disabled={submitting}
        className="group mt-2 h-12 w-full text-[14px]"
      >
        {submitting ? (
          <>
            <Spinner size={14} /> Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </>
        )}
      </FeyButton>
    </form>
  );
}
