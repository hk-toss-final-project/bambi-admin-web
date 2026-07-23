"use client";

// AI 로그 한 건의 상세를 띄우는 모달.
// 목록에서 행을 누르면 열리고, GET /api/admin/ai-logs/{id} 로 요청·응답 본문을 불러와 보여준다.
// 본문은 대개 JSON 이라 보기 좋게 들여쓰지만, agent 연결 실패 시 응답 본문은 에러 평문일 수
// 있어 그때는 원문 그대로 보여준다(파싱 실패해도 깨지지 않게).

import { useEffect, useState } from "react";

import { resolveErrorMessage } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";

import { type AdminAiLogDetail, fetchAiLogDetail } from "./ai-logs";

export function LogDetailDialog({
  logId,
  onClose,
}: {
  logId: number | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminAiLogDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 부모가 logId 별로 key 를 주어 remount 하므로, 열릴 때 상태는 이미 초깃값(null)이다.
  // 그래서 여기선 effect 안에서 동기 리셋 없이 바로 불러온다(cascading render 방지).
  // 늦게 도착한 응답이 닫힌 모달을 건드리지 않게 alive 가드만 둔다.
  useEffect(() => {
    if (logId === null) return;
    let alive = true;
    fetchAiLogDetail(logId)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch((err) => {
        if (!alive) return;
        const code = err instanceof ApiError ? err.code : undefined;
        setError(resolveErrorMessage(code));
      });
    return () => {
      alive = false;
    };
  }, [logId]);

  // Esc 로 닫기. 모달이 열려 있을 때만 리스너를 건다.
  useEffect(() => {
    if (logId === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logId, onClose]);

  if (logId === null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI 로그 상세"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI 로그 상세
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          {error !== null ? (
            <p className="py-8 text-center text-sm text-zinc-600 dark:text-zinc-300">
              {error}
            </p>
          ) : detail === null ? (
            <div className="space-y-3">
              <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ) : (
            <DetailBody detail={detail} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailBody({ detail }: { detail: AdminAiLogDetail }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <Meta label="엔드포인트" value={detail.endpoint} mono />
        <Meta label="사용자" value={detail.userEmail ?? "—"} />
        <Meta label="상태 코드" value={detail.statusCode?.toString() ?? "—"} />
        <Meta label="요청 시각" value={formatTime(detail.requestedAt)} />
        <Meta
          label="응답 시각"
          value={detail.respondedAt !== null ? formatTime(detail.respondedAt) : "처리 중"}
        />
      </dl>

      <BodyBlock title="요청 본문" body={detail.requestBody} />
      <BodyBlock title="응답 본문" body={detail.responseBody} />
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd
        className={`text-zinc-800 dark:text-zinc-200 ${mono ? "break-all font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </>
  );
}

/** 본문 한 덩어리. JSON 이면 들여써서, 아니면 원문 그대로. 비어 있으면 "—". */
function BodyBlock({ title, body }: { title: string; body: string | null }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      {body === null || body === "" ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
          —
        </p>
      ) : (
        <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          {prettyJson(body)}
        </pre>
      )}
    </div>
  );
}

/** JSON 문자열이면 2칸 들여쓰기로, 아니면(에러 평문 등) 원문 그대로 돌려준다. */
function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/** ISO 시각을 "YYYY-MM-DD HH:mm" 로. 문자열만 잘라 시간대·hydration 흔들림을 피한다. */
function formatTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}
