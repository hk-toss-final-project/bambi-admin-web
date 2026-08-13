"use client";

// 관리자 화면 진입 가드.
//
// 토큰이 없으면 화면을 그리기 전에 로그인으로 보낸다. 이게 없을 때는 콘솔을 열면 지표 자리에
// 오류 카드만 뜨고, 사용자는 "다시 로그인해 주세요" 를 읽고도 갈 곳이 없었다.
//
// **리다이렉트는 api-client 가 아니라 여기서 한다.** api-client 는 토큰만 지운다 —
// 요청 계층이 네비게이션까지 하면 동시에 뜬 여러 요청이 각자 이동을 걸어 무한 리다이렉트가 된다.
// 그래서 api-client 는 만료를 이벤트로 알리고, 화면 계층인 여기서 한 번만 이동한다.
//
// 토큰 유무는 localStorage(외부 상태)라 `useSyncExternalStore` 로 읽는다. effect 에서
// setState 로 흉내내면 렌더 이후 한 번 더 그려지고, 그 사이 관리자 화면이 번쩍인다.

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { AUTH_EXPIRED_EVENT } from "@/lib/api-client";
import { getAccessToken } from "@/lib/token";

/** 토큰이 바뀌면(다른 탭 로그아웃·만료) 다시 판정하도록 구독한다. */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_EXPIRED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_EXPIRED_EVENT, onChange);
  };
}

const hasTokenSnapshot = (): boolean => getAccessToken() !== null;

/** 서버 렌더에는 localStorage 가 없다 — 판정 불가(null)로 두고 본문을 그리지 않는다. */
const serverSnapshot = (): boolean | null => null;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasToken = useSyncExternalStore(subscribe, hasTokenSnapshot, serverSnapshot);

  useEffect(() => {
    if (hasToken === false) router.replace("/login");
  }, [hasToken, router]);

  useEffect(() => {
    // 쓰는 중에 만료된 경우 — api-client 가 토큰을 지우고 이 이벤트를 쏜다.
    // 위 구독으로 hasToken 도 false 가 되지만, 만료였다는 사실은 그것만으론 구분되지 않아
    // 이유를 쿼리로 실어 보낸다.
    function onExpired() {
      router.replace("/login?expired=1");
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [router]);

  if (hasToken !== true) return null;
  return <>{children}</>;
}
