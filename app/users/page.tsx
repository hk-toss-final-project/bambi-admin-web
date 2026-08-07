"use client";

// 관리자 — 사용자 목록 화면.
// 데이터는 service-api 실연동(admin-users.ts, GET /api/admin/users).
// 검색(이름·이메일)·상태 필터·열 정렬은 목록이 작아 화면 안(client-side)에서 처리한다.
//
// 행마다 두 가지를 할 수 있다:
//  · 활성/비활성 — PATCH /status. 서버가 돌려준 값으로 그 줄만 고친다.
//  · 컨텍스트 재동기화 — POST /context-sync. 관심사가 agent 에 안 붙은 계정 복구용.
// 둘 다 결과를 화면에 알린다. 특히 재동기화는 눌러도 목록 모양이 안 변해서,
// 알림이 없으면 됐는지 안 됐는지 알 길이 없다.

import { useMemo, useState } from "react";

import { resolveErrorMessage } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";

import { EmptyState, ErrorState, LoadingRows } from "../_components/async-states";
import { FilterTabs, NoMatchState, SearchInput } from "../_components/filters";
import { useAsyncData } from "../_hooks/use-async-data";
import {
  type AdminUser,
  fetchAdminUsers,
  resyncAgentContext,
  setUserActive,
} from "./admin-users";

/** 행 조작의 결과 알림. 성공·실패를 같은 자리에 띄운다. */
type Notice = { tone: "ok" | "error"; text: string };

/** 진행 중인 행 조작 — 어느 행의 어떤 버튼을 눌렀는지. 그 버튼에만 진행 표시를 준다. */
type RowAction = { id: number; kind: "toggle" | "resync" };

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SortKey = "displayName" | "joinedAt" | "status";
type SortDir = "asc" | "desc";

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "ACTIVE", label: "활성" },
  { value: "INACTIVE", label: "비활성" },
];

export default function AdminUsersPage() {
  // users === null 로딩 중 · [] 불러왔지만 비어 있음 · error 실패 — 이 셋으로 화면을 분기한다.
  const { data: users, error, retry, setData: setUsers } = useAsyncData(fetchAdminUsers);

  // 검색·필터·정렬 상태. 기본 정렬은 백엔드와 같은 가입 최신순.
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // 헤더를 누르면 같은 열은 방향만 뒤집고, 다른 열이면 그 열로 바꾼다.
  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // 진행 중인 조작(어느 행의 어떤 버튼인지)과 마지막 결과 알림.
  const [busy, setBusy] = useState<RowAction | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  /** 행 조작 공통 — 한 번에 하나만, 결과는 성공이든 실패든 알린다. */
  async function runRowAction(target: RowAction, run: () => Promise<string>) {
    setBusy(target);
    setNotice(null);
    try {
      setNotice({ tone: "ok", text: await run() });
    } catch (err) {
      // 서버 원문 대신 code 기준 문구를 쓴다(CLAUDE.md §2).
      const code = err instanceof ApiError ? err.code : undefined;
      setNotice({ tone: "error", text: resolveErrorMessage(code) });
    } finally {
      setBusy(null);
    }
  }

  // 계정 활성/비활성 뒤집기. 서버가 돌려준 값으로 그 줄만 바꾼다(목록 전체 재조회 없이).
  function toggleStatus(user: AdminUser) {
    const nextActive = user.status !== "ACTIVE";
    return runRowAction({ id: user.id, kind: "toggle" }, async () => {
      const updated = await setUserActive(user.id, nextActive);
      setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? prev);
      return `${updated.displayName} 계정을 ${nextActive ? "활성화" : "비활성화"}했습니다.`;
    });
  }

  // agent 컨텍스트 강제 재동기화. 목록 모양은 안 변하므로 결과 문구로만 알린다.
  function resyncContext(user: AdminUser) {
    return runRowAction({ id: user.id, kind: "resync" }, async () => {
      const result = await resyncAgentContext(user.id);
      return `${user.displayName} 관심사를 agent 에 다시 보냈습니다 (버전 ${result.contextVersion}).`;
    });
  }

  // 검색→필터→정렬을 순서대로 건 결과. 원본(users)은 그대로 두고 파생만 만든다.
  const visibleUsers = useMemo(
    () => (users === null ? [] : sortUsers(filterUsers(users, query, statusFilter), sortKey, sortDir)),
    [users, query, statusFilter, sortKey, sortDir],
  );

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

      {error !== null ? (
        <ErrorState message={error} onRetry={retry} />
      ) : users === null ? (
        <LoadingRows />
      ) : users.length === 0 ? (
        <EmptyState message="아직 표시할 사용자가 없습니다." />
      ) : (
        <>
          {/* 목록이 있을 때만 조작 UI를 띄운다 — 빈 화면에 검색창만 덩그러니 두지 않는다. */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="이름 · 이메일 검색"
            />
            <FilterTabs
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          {notice !== null && <NoticeBar notice={notice} />}

          {visibleUsers.length === 0 ? (
            <NoMatchState message="검색·필터 조건에 맞는 사용자가 없습니다." />
          ) : (
            <UserTable
              users={visibleUsers}
              busy={busy}
              onToggle={toggleStatus}
              onResync={resyncContext}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          )}
        </>
      )}
    </main>
  );
}

/** 검색어(이름·이메일, 대소문자 무시)와 상태로 거른다. */
function filterUsers(users: AdminUser[], query: string, status: StatusFilter): AdminUser[] {
  const q = query.trim().toLowerCase();
  return users.filter((u) => {
    if (status !== "ALL" && u.status !== status) return false;
    if (q === "") return true;
    return (
      u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });
}

/** 선택한 열·방향으로 정렬한다. 이름은 한글 정렬(localeCompare), 나머지는 문자열 비교로 충분. */
function sortUsers(users: AdminUser[], key: SortKey, dir: SortDir): AdminUser[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...users].sort((a, b) => {
    const cmp =
      key === "displayName"
        ? a.displayName.localeCompare(b.displayName, "ko")
        : a[key].localeCompare(b[key]);
    return cmp * factor;
  });
}

/** 행 조작 결과 한 줄. 성공은 옅은 초록, 실패는 옅은 빨강으로만 구분한다. */
function NoticeBar({ notice }: { notice: Notice }) {
  const tone =
    notice.tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  return (
    <div role="status" className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${tone}`}>
      {notice.text}
    </div>
  );
}

function UserTable({
  users,
  busy,
  onToggle,
  onResync,
  sortKey,
  sortDir,
  onSort,
}: {
  users: AdminUser[];
  busy: RowAction | null;
  onToggle: (user: AdminUser) => void;
  onResync: (user: AdminUser) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <SortableHeader label="사용자" col="displayName" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th className="px-4 py-3 font-medium">이메일</th>
            <SortableHeader label="가입일" col="joinedAt" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableHeader label="상태" col="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
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
                  <StatusBadge active={active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <RowButton
                      onClick={() => onResync(u)}
                      disabled={busy !== null}
                      busy={busy?.id === u.id && busy.kind === "resync"}
                      title="관심사를 agent 에 다시 밀어넣습니다"
                    >
                      재동기화
                    </RowButton>
                    <RowButton
                      onClick={() => onToggle(u)}
                      disabled={busy !== null}
                      busy={busy?.id === u.id && busy.kind === "toggle"}
                    >
                      {active ? "비활성화" : "활성화"}
                    </RowButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 행 안의 작은 조작 버튼. 요청이 도는 동안엔 눌린 버튼만 "…"로 바꾸고,
 * 나머지는 흐리게 잠근다 — 두 요청이 겹쳐 결과 알림이 엇갈리는 걸 막는다.
 */
function RowButton({
  onClick,
  disabled,
  busy,
  title,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-busy={busy}
      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {busy ? "처리 중…" : children}
    </button>
  );
}

/** 정렬 가능한 헤더 셀. 현재 정렬 열이면 방향 화살표를 붙인다. */
function SortableHeader({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = col === sortKey;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 transition-colors hover:text-zinc-800 dark:hover:text-zinc-100"
      >
        {label}
        {/* 정렬 중인 열만 방향 표시. 비활성 열은 흐린 ↕ 로 "누르면 정렬됨"을 암시. */}
        <span className={active ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-300 dark:text-zinc-600"}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
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
