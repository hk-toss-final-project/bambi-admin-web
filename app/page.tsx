import Link from "next/link";

// 관리자 콘솔 홈. P0 화면 2개(사용자 목록·AI 로그)로 들어가는 입구.

export default function AdminHome() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Bambi Admin
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        관리자 콘솔
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/users"
          className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/40"
        >
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            사용자 관리
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            계정 조회 · 비활성화/활성화
          </p>
        </Link>

        <Link
          href="/logs"
          className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/40"
        >
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            AI 처리 로그
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Agent 호출 처리 내역 · 성공/실패 추적
          </p>
        </Link>
      </div>
    </main>
  );
}
