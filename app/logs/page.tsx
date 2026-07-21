"use client";

// 관리자 — AI 처리 로그 화면.
// 저장→요약→카드 흐름에서 Agent 호출이 어떻게 처리됐는지(성공·실패·진행 중)를
// 관리자가 훑어보는 곳. 데이터는 아직 mock(mock-logs.ts)이고, 실제 Gateway(P1)가
// ai_request_logs/ai_response_logs를 내려주면 fetchAiLogs 만 실제 호출로 바꾼다.

import { EmptyState, ErrorState, LoadingRows } from "../_components/async-states";
import { useAsyncData } from "../_hooks/use-async-data";
import { type AdminAiLog, type AiLogStatus, fetchAiLogs } from "./mock-logs";

export default function AdminAiLogsPage() {
  // 사용자 목록과 같은 3분기: logs === null 로딩 · [] 로그 없음 · error 실패.
  const { data: logs, error, retry } = useAsyncData(fetchAiLogs);

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
        <LogTable logs={logs} />
      )}
    </main>
  );
}

function LogTable({ logs }: { logs: AdminAiLog[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-4 py-3 font-medium">시각</th>
            <th className="px-4 py-3 font-medium">사용자</th>
            <th className="px-4 py-3 font-medium">작업</th>
            <th className="px-4 py-3 font-medium">모델</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 text-right font-medium">소요시간</th>
            <th className="px-4 py-3 font-medium">비고</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((row) => (
            <tr
              key={row.id}
              className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/40"
            >
              <td className="px-4 py-3 tabular-nums text-zinc-500 dark:text-zinc-400">
                {row.requestedAt}
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                {row.userEmail}
              </td>
              <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                {row.task}
              </td>
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                {row.model}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatLatency(row.latencyMs)}
              </td>
              {/* 실패 사유는 이 화면의 핵심 정보라 흐리게 죽이지 않고 그대로 보여준다. */}
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                {row.failureReason ?? "—"}
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
