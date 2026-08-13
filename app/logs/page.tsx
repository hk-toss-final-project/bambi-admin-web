"use client";

// 관리자 — AI 처리 로그 화면.
// Agent 호출이 어떻게 처리됐는지(성공·실패·진행 중)를 관리자가 훑어보는 곳.
// 데이터는 service-api 실연동(ai-logs.ts, GET /api/admin/ai-logs).
//
// 상태 필터는 서버에 넘긴다(탭을 바꾸면 그 상태만 다시 받아온다) — 실패만 보려고 전체를
// 받아올 이유가 없고, 대시보드에서 /logs?status=FAILED 로 바로 들어올 수 있다.
// 검색(엔드포인트·이메일)은 받아온 목록 안에서 거른다. 행을 누르면 상세를 모달로 연다.
// 로그 적재는 실제 Gateway(P1)부터라 그전까진 빈 목록(Empty)이 정상이다.

import { useSearchParams } from "next/navigation";

import { AuthGate } from "../_components/auth-gate";
import { Suspense, useCallback, useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingRows } from "../_components/async-states";
import { FilterTabs, NoMatchState, SearchInput } from "../_components/filters";
import { useAsyncData } from "../_hooks/use-async-data";
import {
  type AdminAiLog,
  type AiLogStatus,
  type AiLogStatusFilter,
  fetchAiLogs,
} from "./ai-logs";
import { formatLogTime } from "./format-time";
import { LogDetailDialog } from "./log-detail-dialog";

const STATUS_FILTERS: ReadonlyArray<{ value: AiLogStatusFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "SUCCESS", label: "성공" },
  { value: "FAILED", label: "실패" },
  { value: "PROCESSING", label: "처리 중" },
];

/**
 * useSearchParams 는 Suspense 경계 안에서만 쓸 수 있어(프리렌더 규칙) 화면을 한 겹 감싼다.
 * fallback 은 평소 로딩과 같은 스켈레톤이라 사용자 눈엔 차이가 없다.
 */
export default function AdminAiLogsPage() {
  return (
    <AuthGate>
      <AdminAiLogsPageBody />
    </AuthGate>
  );
}

function AdminAiLogsPageBody() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <AiLogsView />
    </Suspense>
  );
}

function AiLogsView() {
  // 대시보드에서 "실패 N건 전체 보기"로 들어오면 그 탭이 눌린 채 시작한다.
  const initialStatus = toStatusFilter(useSearchParams().get("status"));

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AiLogStatusFilter>(initialStatus);
  // 상세 모달로 열려 있는 로그 id. null 이면 닫힘.
  const [openLogId, setOpenLogId] = useState<number | null>(null);

  // 탭이 바뀌면 이 참조가 새로 만들어져 그 상태로 다시 불러온다(useAsyncData 규칙).
  const load = useCallback(() => fetchAiLogs(statusFilter), [statusFilter]);
  const { data: logs, error, retry } = useAsyncData(load);

  // 검색은 받아온 목록 안에서만 건다(상태는 이미 서버가 걸렀다).
  const visibleLogs = useMemo(
    () => (logs === null ? [] : filterLogs(logs, query)),
    [logs, query],
  );
  const filtering = statusFilter !== "ALL";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <LogsHeader />

      {error !== null ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          {/* 조작 UI 는 로딩·빈 목록에도 남겨둔다 — 필터를 걸어 0건이 됐을 때
              탭이 사라지면 되돌아올 길이 없다. */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="엔드포인트 · 사용자 검색"
            />
            <FilterTabs
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          {logs === null ? (
            <LoadingRows />
          ) : logs.length === 0 ? (
            <EmptyState
              message={
                filtering
                  ? "이 상태의 AI 요청이 없습니다."
                  : "아직 처리된 AI 요청이 없습니다."
              }
            />
          ) : visibleLogs.length === 0 ? (
            <NoMatchState message="검색 조건에 맞는 로그가 없습니다." />
          ) : (
            <LogTable logs={visibleLogs} onSelect={setOpenLogId} />
          )}
        </>
      )}

      {/* key={openLogId} — 로그마다 새로 mount 해 상태(로딩·본문)를 깔끔히 초기화한다. */}
      <LogDetailDialog key={openLogId} logId={openLogId} onClose={() => setOpenLogId(null)} />
    </main>
  );
}

function LogsHeader() {
  return (
    <header className="mb-6">
      <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        AI 처리 로그
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Agent 호출 처리 내역 · 성공/실패 추적
      </p>
    </header>
  );
}

function LoadingShell() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <LogsHeader />
      <LoadingRows />
    </main>
  );
}

/** URL 의 status 값을 탭 값으로. 모르는 값(직접 친 주소 등)은 전체로 둔다. */
function toStatusFilter(raw: string | null): AiLogStatusFilter {
  const found = STATUS_FILTERS.find((option) => option.value === raw?.toUpperCase());
  return found?.value ?? "ALL";
}

/** 검색어(엔드포인트·이메일, 대소문자 무시)로 거른다. 상태는 서버가 이미 걸렀다. */
function filterLogs(logs: AdminAiLog[], query: string): AdminAiLog[] {
  const q = query.trim().toLowerCase();
  return logs.filter((row) => {
    if (q === "") return true;
    return (
      row.endpoint.toLowerCase().includes(q) ||
      (row.userEmail?.toLowerCase().includes(q) ?? false)
    );
  });
}

function LogTable({
  logs,
  onSelect,
}: {
  logs: AdminAiLog[];
  onSelect: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-4 py-3 font-medium">시각</th>
            <th className="px-4 py-3 font-medium">사용자</th>
            <th className="px-4 py-3 font-medium">엔드포인트</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 text-right font-medium">소요시간</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row.id)}
              className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/40"
            >
              <td className="px-4 py-3 tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatLogTime(row.requestedAt)}
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                {row.userEmail ?? "—"}
              </td>
              {/* 엔드포인트는 어떤 agent 호출이었는지를 가리킨다 — 경로라 등폭(mono)으로. */}
              <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                {row.endpoint}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatLatency(row.latencyMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 상태별 배지 색을 한 곳에 모아 둔다. 삼항을 세 번 겹치는 것보다, 상태가 늘어나도
// 여기만 추가하면 되는 이 방식이 읽기도 고치기도 낫다.
const STATUS_BADGE: Record<
  AiLogStatus,
  { label: string; dot: string; className: string }
> = {
  SUCCESS: {
    label: "성공",
    dot: "bg-emerald-500",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  FAILED: {
    label: "실패",
    dot: "bg-red-500",
    className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  PROCESSING: {
    label: "처리 중",
    dot: "bg-amber-500",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
};

function StatusBadge({ status }: { status: AiLogStatus }) {
  const badge = STATUS_BADGE[status];
  // 처리 중인 건은 점을 깜빡여 "지금 돌고 있음"을 눈으로 알린다.
  const pulse = status === "PROCESSING" ? "animate-pulse" : "";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot} ${pulse}`} />
      {badge.label}
    </span>
  );
}

/** 소요시간을 사람이 읽기 편한 단위로. 아직 안 끝난 요청은 값이 없으니 "—". */
function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}
