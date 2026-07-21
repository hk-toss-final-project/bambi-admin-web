import { useEffect, useState } from "react";

import { resolveErrorMessage } from "@/constants/errors";
import { ApiError } from "@/lib/api-client";

/**
 * "한 번 불러와서 보여주는" 관리자 화면들이 똑같이 쓰던 로딩·오류·재시도 흐름을 모았다.
 *
 * 반환값 규칙은 화면 쪽 분기와 1:1이다:
 *   data === null  → 로딩 중
 *   error !== null → 실패 (문구는 code 기준으로 이미 골라 둔 것)
 *   그 외          → data 그대로
 *
 * setData 를 함께 돌려주는 건, 목록을 받아온 뒤 화면에서 낙관적으로 손보는 경우(예:
 * 사용자 활성/비활성 토글)가 있어서다. 읽기만 하는 화면은 안 쓰면 그만이다.
 *
 * 주의: fetcher 는 매 렌더 새로 만들어지지 않는 안정적인 참조여야 한다(모듈 레벨 함수 등).
 * 인라인 화살표를 넘기면 effect 가 매 렌더 다시 돈다.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 재시도 트리거. 값이 바뀌면 아래 effect 가 다시 돈다.
  const [reloadKey, setReloadKey] = useState(0);

  // 리셋을 이벤트 핸들러에 두는 이유: effect 안에서 동기 setState 를 하면
  // 불필요한 연쇄 렌더가 생겨 lint(react-hooks/set-state-in-effect)가 막는다.
  function retry() {
    setData(null);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  useEffect(() => {
    let alive = true; // 화면을 떠난 뒤 늦게 도착한 응답이 상태를 건드리지 않게 막는 가드
    fetcher()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((err) => {
        // 서버 error.message 원문은 노출하지 않고 code 로 문구를 정한다(CLAUDE.md §4).
        if (!alive) return;
        const code = err instanceof ApiError ? err.code : undefined;
        setError(resolveErrorMessage(code));
      });
    return () => {
      alive = false;
    };
  }, [fetcher, reloadKey]);

  return { data, error, retry, setData };
}
