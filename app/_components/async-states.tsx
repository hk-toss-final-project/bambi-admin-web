// 관리자 화면들이 공통으로 쓰는 비동기 상태 UI — 로딩 / 빈 목록 / 오류.
//
// 사용자 목록·AI 로그처럼 "표를 불러와 보여주는" 화면이 여러 개라, 상태 표시를
// 화면마다 각자 그리면 톤이 미묘하게 어긋나고 복붙만 늘어난다. 그래서 여기 한 곳에
// 모아두고, 각 페이지는 데이터 성격에 맞는 문구만 넘겨 쓴다.

/** 표가 뜨기 직전의 스켈레톤. 실제 API로 바뀌면 이 자리가 잠깐 보인다. */
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/60"
        />
      ))}
    </div>
  );
}

/** 불러왔지만 보여줄 게 없을 때. 문구는 화면마다 다르니 받아서 쓴다. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      {message}
    </div>
  );
}

/**
 * 불러오기가 실패했을 때. 여기선 사유를 판단하지 않고, 이미 code 기준으로 고른
 * 문구(message)를 받아 그대로 보여주고 재시도 길만 열어준다.
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 py-16 text-center dark:border-zinc-800">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        다시 시도
      </button>
    </div>
  );
}
