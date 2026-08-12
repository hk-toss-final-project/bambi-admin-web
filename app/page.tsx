"use client";

// 관리자 콘솔 홈 — 운영 대시보드.
//
// 예전엔 화면 2개로 들어가는 링크만 있었다. 관리자가 매번 두 화면을 열어보고서야
// "오늘 뭔가 잘못됐나"를 알 수 있었는데, 그건 목록이 답할 질문이 아니다. 그래서 첫 화면을
// 지표로 바꾸고, 링크는 그 아래에 남긴다. 지표는 전부 기존 데이터 집계다(새 테이블 없음).

import Link from "next/link";

import { EmptyState, ErrorState, LoadingRows } from "./_components/async-states";
import { useAsyncData } from "./_hooks/use-async-data";
import { type AdminDashboard, fetchDashboard } from "./dashboard";

export default function AdminHome() {
  const { data, error, retry } = useAsyncData(fetchDashboard);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Bambi Admin
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          관리자 콘솔
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          서비스 현황 한눈에 보기
        </p>
      </header>

      {error !== null ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data === null ? (
        <LoadingRows rows={3} />
      ) : (
        <Overview data={data} />
      )}

      <ShortcutCards />
    </main>
  );
}

function Overview({ data }: { data: AdminDashboard }) {
  const { users, reports, ai, generations } = data;
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="전체 사용자"
          value={users.total.toLocaleString()}
          hint={`활성 ${users.active} · 비활성 ${users.inactive}`}
        />
        <StatCard
          label="오늘 가입"
          value={users.joinedToday.toLocaleString()}
          hint="오늘 00시(KST) 기준"
        />
        <StatCard
          label="전체 리포트"
          value={reports.total.toLocaleString()}
          hint={`오늘 생성 ${reports.createdToday}`}
        />
        <StatCard
          label="AI 호출 성공률"
          value={ai.total === 0 ? "—" : `${ai.successRate}%`}
          // "평균 61ms" 를 AI 처리 시간으로 읽으면 안 된다 — 생성 요청은 agent 가 202 로
          // 즉시 응답하므로 이건 HTTP 왕복이다. 실제 소요는 아래 "리포트 생성" 카드가 낸다.
          hint={
            ai.total === 0
              ? "아직 호출 없음"
              : `접수 응답 ${formatLatency(ai.avgLatencyMs)} · 처리중 ${ai.processing}`
          }
          // 끝난 호출이 있는데 성공률이 낮으면 색으로 먼저 눈에 띄게 한다.
          tone={ai.success + ai.failed > 0 && ai.successRate < 90 ? "warn" : "normal"}
        />
      </section>

      <GenerationStatus generations={generations} />
      <RecentFailures failures={data.recentFailures} failedTotal={ai.failed} />
    </>
  );
}

/**
 * 리포트 생성 현황 — 접수부터 카드 발행까지의 수명주기.
 *
 * 위 "AI 호출 성공률"로는 이걸 못 본다. 생성 요청은 agent 가 202 로 즉시 응답해
 * 호출로는 항상 성공이고, 실제 리포트는 그 뒤에 워커가 만든다. 그래서 큐가 밀려
 * 리포트가 20분씩 걸려도 위 카드들은 전부 정상으로 보인다(2026-08-12 운영 실측).
 */
function GenerationStatus({
  generations,
}: {
  generations: AdminDashboard["generations"];
}) {
  const { inProgress, completedToday, failedToday, avgSeconds, maxSeconds } = generations;
  // 진행 중이 쌓이는 건 큐 적체 신호다. 정상 운영에서는 워커 수(10) 언저리를 넘지 않는다.
  const backlog = inProgress >= 20;

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          리포트 생성 현황
        </h2>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          요청 접수부터 카드가 나오기까지 — 위 AI 호출 지표와 다른 것을 잽니다
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="진행 중"
          value={inProgress.toLocaleString()}
          hint={backlog ? "큐가 밀려 있습니다" : "대기 · 생성 · 발행 중"}
          tone={backlog ? "warn" : "normal"}
        />
        <StatCard
          label="오늘 완료"
          value={completedToday.toLocaleString()}
          hint="카드까지 발행된 건"
        />
        <StatCard
          label="오늘 실패"
          value={failedToday.toLocaleString()}
          hint="실패 · 취소 합계"
          tone={failedToday > 0 ? "warn" : "normal"}
        />
        <StatCard
          label="평균 소요"
          value={formatDuration(avgSeconds)}
          // 평균만 보면 꼬리가 안 보인다. 최장 건을 같이 낸다.
          hint={maxSeconds === null ? "오늘 완료 건 없음" : `최장 ${formatDuration(maxSeconds)}`}
        />
      </div>
    </section>
  );
}

/** 최근 실패 미리보기. 여기서 바로 실패만 걸러진 로그 화면으로 넘어간다. */
function RecentFailures({
  failures,
  failedTotal,
}: {
  failures: AdminDashboard["recentFailures"];
  failedTotal: number;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          최근 실패한 AI 호출
        </h2>
        {failedTotal > 0 && (
          <Link
            href="/logs?status=FAILED"
            className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            실패 {failedTotal}건 전체 보기 →
          </Link>
        )}
      </div>

      {failures.length === 0 ? (
        <EmptyState message="최근 실패한 호출이 없습니다." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium">시각</th>
                <th className="px-4 py-3 font-medium">사용자</th>
                <th className="px-4 py-3 font-medium">응답</th>
                <th className="px-4 py-3 font-medium">엔드포인트</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatTime(row.requestedAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {row.userEmail ?? "—"}
                  </td>
                  {/* 상태코드 없이 엔드포인트만 있으면 한 건씩 상세를 열어야 원인을 안다.
                      응답이 아예 없는 경우(타임아웃·연결 실패)도 그 자체가 정보라 구분해 쓴다. */}
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-400">
                    {row.statusCode ?? "무응답"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {row.endpoint}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "normal",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "normal" | "warn";
}) {
  const valueTone =
    tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-zinc-900 dark:text-zinc-50";
  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${valueTone}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
    </div>
  );
}

function ShortcutCards() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      <Link
        href="/users"
        className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/40"
      >
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          사용자 관리
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          계정 조회 · 비활성화/활성화 · 컨텍스트 재동기화
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
  );
}

/** 1초를 넘기면 초 단위가 읽기 쉽다. 성공 건이 없어 값이 없으면 "—". */
function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}초` : `${ms}ms`;
}

/**
 * 생성 소요시간(초) 표기. 1분을 넘기면 "1분 34초" 가 "94초" 보다 즉시 읽힌다.
 * 완료 건이 없으면 null 이 오고 "—" 로 둔다 — 0 으로 내리면 "0초에 끝났다"로 읽힌다.
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
}

/** 대시보드는 최근 것만 보여주므로 날짜까지 다 쓰지 않고 월-일 시:분으로 줄인다. */
function formatTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
