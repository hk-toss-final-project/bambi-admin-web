/**
 * 관리자 사용자 목록 — service-api 실연동.
 *
 * GET /api/admin/users (ADMIN 권한)를 호출한다. 공통 client(apiGet)가 Bearer 토큰 주입과
 * 에러 정규화(ApiError)를 처리하므로 여기선 경로와 타입만 정한다.
 *
 * 필드는 백엔드(AdminUserResponse)가 실제로 내려주는 것과 1:1이다. 초기 목업엔 plan·최근활동·
 * 공개브리핑도 있었지만 users 스키마에 없어 뺐다(P1). 스키마가 늘면 여기 타입부터 맞춘다.
 */

import { apiGet, apiPost, request } from "@/lib/api-client";

/** 관리자 화면에서 보는 사용자 한 명. */
export type AdminUser = {
  id: number;
  displayName: string;
  email: string;
  joinedAt: string; // 가입일 (YYYY-MM-DD)
  status: "ACTIVE" | "INACTIVE"; // 백엔드에서 deletedAt 유무로 파생
};

/** 관리자용 사용자 목록을 가입 최신순으로 가져온다. */
export function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>("/api/admin/users");
}

/**
 * 계정 활성/비활성 전환. 갱신된 사용자 한 줄이 돌아오므로 그 값으로 목록을 고친다.
 *
 * ⚠️ 비활성화해도 이미 발급된 토큰이 즉시 죽지는 않는다(인증 필터가 stateless).
 * 로그인·재발급이 막히고 me 호출 시 로그아웃되는 방식이라, 즉시 차단이 필요하면 별도 과제다.
 */
export function setUserActive(id: number, active: boolean): Promise<AdminUser> {
  return request<AdminUser>(`/api/admin/users/${id}/status`, {
    method: "PATCH",
    body: { active },
  });
}

/** 강제 재동기화 결과. 백엔드 AdminContextSyncResponse 와 1:1. */
export type ContextSyncResult = {
  userId: number;
  email: string;
  contextVersion: number; // 이번에 agent 로 나간 컨텍스트 버전
  syncedAt: string;
};

/**
 * agent 컨텍스트를 손으로 다시 밀어 넣는다(관심사가 agent 에 안 붙은 계정 복구용).
 * 보낼 내용은 서버가 현재 관심사에서 만들므로 body 가 없다.
 * agent 가 못 받으면 ApiError(AGENT_UNAVAILABLE)로 throw 된다 — 화면이 실패를 알려야 한다.
 */
export function resyncAgentContext(id: number): Promise<ContextSyncResult> {
  return apiPost<ContextSyncResult>(`/api/admin/users/${id}/context-sync`);
}
