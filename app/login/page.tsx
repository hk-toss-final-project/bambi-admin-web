"use client";

// 관리자 로그인.
//
// 여기가 없어서 그동안 콘솔을 쓰려면 브라우저 콘솔에서 localStorage 에 토큰을 손으로 넣어야 했다.
// 인증 함수(lib/auth.ts)는 처음부터 다 있었는데 그걸 부르는 화면만 없었다.
//
// ADMIN 이 아닌 계정도 로그인 자체는 성공한다(/api/auth/login 은 권한을 안 본다). 그 상태로
// 콘솔에 들여보내면 화면마다 403 을 맞으며 "권한이 없다"만 반복해서 보게 되므로, 로그인 직후
// 응답에 동봉된 roles 로 걸러 여기서 안내한다 — /api/auth/me 를 다시 부르지 않아도 알 수 있다.

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ERROR_MESSAGES, resolveErrorMessage } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";
import { login } from "@/lib/auth";
import { clearAccessToken } from "@/lib/token";

const ADMIN_ROLE = "ADMIN";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // 토큰이 만료돼 가드가 되돌려보낸 경우 — 이유를 밝혀 준다. 아무 설명 없이 로그인 화면이
  // 다시 뜨면 사용자는 "방금 로그인했는데?" 로 읽는다.
  const expired = params.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return; // 중복 제출 방지
    setSubmitting(true);
    setError(null);
    try {
      const data = await login({ email, password });
      if (!data.user.roles.includes(ADMIN_ROLE)) {
        // 토큰을 남겨두면 콘솔이 403 을 계속 맞는다. 받은 즉시 버린다.
        clearAccessToken();
        setError("관리자 권한이 없는 계정이에요. 관리자 계정으로 로그인해 주세요.");
        return;
      }
      router.replace("/");
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code : undefined;
      setError(resolveErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Bambi Admin
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          관리자 로그인
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          운영 지표와 계정 관리는 관리자만 볼 수 있어요
        </p>
      </header>

      {expired ? (
        <p
          role="status"
          className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        >
          {ERROR_MESSAGES.AUTH_INVALID_TOKEN}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {error !== null ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {submitting ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}
