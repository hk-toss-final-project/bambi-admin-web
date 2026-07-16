"use client";

// 관리자 — 사용자 목록 화면.
// 목업: bambi-service-web/docs/design-handoff/admin/admin-users-rough.html
// 데이터는 아직 mock (mock-users.ts). 계정 활성/비활성 토글도 지금은 화면 안에서만 동작하고,
// 실제 API(우석·영현 도메인)가 나오면 fetchAdminUsers 와 toggle 부분을 실제 호출로 바꾼다.

import { useEffect, useState } from "react";

import { type AdminUser, fetchAdminUsers } from "./mock-users";

export default function AdminUsersPage() {
  // null = 아직 로딩 중, [] = 불러왔는데 비어 있음 → 이 둘을 구분해서 화면을 다르게 보여준다.
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  useEffect(() => {
    let alive = true; // 화면을 벗어난 뒤 늦게 도착한 응답이 상태를 건드리지 않게 막는 가드
    fetchAdminUsers().then((rows) => {
      if (alive) setUsers(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 계정 활성/비활성 뒤집기. 지금은 로컬 상태만 바꾼다.
  // TODO(api): 실제로는 여기서 apiPost(`/api/admin/users/${id}/status`, ...) 를 부르고 성공 시 반영.
  function toggleStatus(id: number) {
    setUsers((prev) =>
      prev?.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }
          : u,
      ) ?? prev,
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          사용자 관리
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          계정 조회 · 비활성화/활성화
        </p>
      </header>

      {users === null ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState />
      ) : (
        <UserTable users={users} onToggle={toggleStatus} />
      )}
    </main>
  );
}

function UserTable({
  users,
  onToggle,
}: {
  users: AdminUser[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-4 py-3 font-medium">사용자</th>
            <th className="px-4 py-3 font-medium">이메일</th>
            <th className="px-4 py-3 font-medium">가입일</th>
            <th className="px-4 py-3 font-medium">플랜</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">최근 활동</th>
            <th className="px-4 py-3 text-right font-medium">공개 브리핑</th>
            <th className="px-4 py-3 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const active = u.status === "ACTIVE";
            return (
              <tr
                key={u.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/40"
              >
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {u.displayName}
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {u.email}
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {u.joinedAt}
                </td>
                <td className="px-4 py-3">
                  <PlanBadge plan={u.plan} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge active={active} />
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {u.lastActive}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {u.publicBriefings}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onToggle(u.id)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {active ? "비활성화" : "활성화"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  // 활성 = 초록, 비활성 = 회색. 색으로 상태를 한눈에 구분되게.
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      활성
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
      비활성
    </span>
  );
}

function PlanBadge({ plan }: { plan: AdminUser["plan"] }) {
  const isPro = plan === "PRO";
  return (
    <span
      className={
        isPro
          ? "rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          : "rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      }
    >
      {isPro ? "Pro" : "Free"}
    </span>
  );
}

function LoadingState() {
  // mock 은 즉시 오지만, 실제 API 로 바뀌면 잠깐 보일 자리. 표 모양의 스켈레톤을 흉내낸다.
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/60"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      아직 표시할 사용자가 없습니다.
    </div>
  );
}
