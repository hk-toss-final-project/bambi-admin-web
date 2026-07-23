"use client";

// 관리자 — AI 처리 로그 화면.
// Agent 호출이 어떻게 처리됐는지(성공·실패·진행 중)를 관리자가 훑어보는 곳.
// 데이터는 service-api 실연동(ai-logs.ts, GET /api/admin/ai-logs).
// 상태 필터·검색(엔드포인트·이메일)은 client-side, 행을 누르면 상세(요청·응답 본문)를 모달로 연다.
// 단, 로그 적재는 실제 Gateway(P1)부터라 그전까진 빈 목록(Empty)이 정상이다.

import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingRows } from "../_components/async-states";
import { FilterTabs, NoMatchState, SearchInput } from "../_components/filters";
import { useAsyncData } from "../_hooks/use-async-data";
import { type AdminAiLog, type AiLogStatus, fetchAiLogs } from "./ai-logs";
import { LogDetailDialog } from "./log-detail-dialog";

type StatusFilter = "ALL" | AiLogStatus;

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "SUCCESS", label: "성공" },
  { value: "FAILED", label: "실패" },
  { value: "PROCESSING", label: "처리 중" },
];

export default function AdminAiLogsPage() {
  // 사용자 목록과 같은 3분기: logs === null 로딩 · [] 로그 없음 · error 실패.
  const { data: logs, error, retry } = useAsyncData(fetchAiLogs);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  // 상세 모달로 열려 있는 로그 id. null 이면 닫힘.
  const [openLogId, setOpenLogId] = useState<number | null>(null);

  // 상태 필터 → 검색(엔드포인트·이메일) 순으로 거른다. 정렬은 백엔드 최신순을 그대로 쓴다.
  const visibleLogs = useMemo(
    () => (logs === null ? [] : filterLogs(logs, query, statusFilter)),
    [logs, query, statusFilter],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          AI 처리 로그
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Agent 호출 처리 내역 · 성공/실패 추적
        </p>
      </header>

      {error !== null ? (
        <ErrorState message={error} onRetry={retry} />
      ) : logs === null ? (
        <LoadingRows />
      ) : logs.length === 0 ? (
        <EmptyState message="아직 처리된 AI 요청이 없습니다." />
      ) : (
        <>
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

          {visibleLogs.length === 0 ? (
            <NoMatchState message="검색·필터 조건에 맞는 로그가 없습니다." />
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

/** 상태 필터와 검색어(엔드포인트·이메일, 대소문자 무시)로 거른다. */
function filterLogs(logs: AdminAiLog[], query: string, status: StatusFilter): AdminAiLog[] {
  const q = query.trim().toLowerCase();
  return logs.filter((row) => {
    if (status !== "ALL" && row.status !== status) return false;
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
                {formatTime(row.requestedAt)}
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

/** 백엔드 ISO 시각을 "YYYY-MM-DD HH:mm" 로. 문자열만 잘라 시간대·hydration 흔들림을 피한다. */
function formatTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}

/** 소요시간을 사람이 읽기 편한 단위로. 아직 안 끝난 요청은 값이 없으니 "—". */
function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}
