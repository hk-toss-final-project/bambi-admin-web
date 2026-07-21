/**
 * 관리자 사용자 목록 — service-api 실연동.
 *
 * GET /api/admin/users (ADMIN 권한)를 호출한다. 공통 client(apiGet)가 Bearer 토큰 주입과
 * 에러 정규화(ApiError)를 처리하므로 여기선 경로와 타입만 정한다.
 *
 * 필드는 백엔드(AdminUserResponse)가 실제로 내려주는 것과 1:1이다. 초기 목업엔 plan·최근활동·
 * 공개브리핑도 있었지만 users 스키마에 없어 뺐다(P1). 스키마가 늘면 여기 타입부터 맞춘다.
 */

import { apiGet } from "@/lib/api-client";

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
