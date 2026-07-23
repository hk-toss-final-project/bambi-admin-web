"use client";

// 관리자 — 사용자 목록 화면.
// 데이터는 service-api 실연동(admin-users.ts, GET /api/admin/users).
// 검색(이름·이메일)·상태 필터·열 정렬은 목록이 작아 화면 안(client-side)에서 처리한다.
// 계정 활성/비활성 토글은 아직 화면 안에서만 동작한다 — 상태 변경 API(PATCH)가 나오면
// toggleStatus 를 실제 호출로 바꾼다. (조회는 실데이터, 변경은 로컬 상태 mock)

import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingRows } from "../_components/async-states";
import { FilterTabs, NoMatchState, SearchInput } from "../_components/filters";
import { useAsyncData } from "../_hooks/use-async-data";
import { type AdminUser, fetchAdminUsers } from "./admin-users";

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

          {visibleUsers.length === 0 ? (
            <NoMatchState message="검색·필터 조건에 맞는 사용자가 없습니다." />
          ) : (
            <UserTable
              users={visibleUsers}
              onToggle={toggleStatus}
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

function UserTable({
  users,
  onToggle,
  sortKey,
  sortDir,
  onSort,
}: {
  users: AdminUser[];
  onToggle: (id: number) => void;
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
