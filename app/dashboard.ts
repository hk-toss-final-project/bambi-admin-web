/**
 * 관리자 운영 대시보드 — service-api 실연동.
 *
 * GET /api/admin/dashboard (ADMIN). 지표가 여러 개라 화면이 API 를 네 번 부르는 대신
 * 백엔드가 한 번에 묶어 내린다. 필드는 백엔드 응답(AdminDashboardResponse)과 1:1이다.
 *
 * 최근 실패 목록의 한 줄은 AI 로그 목록과 같은 모양이라 그 타입(AdminAiLog)을 그대로 쓴다 —
 * 대시보드에서 로그 화면으로 넘어갈 때 같은 값을 보게 하려는 것이다.
 */

import { apiGet } from "@/lib/api-client";

import type { AdminAiLog } from "./logs/ai-logs";

export type AdminDashboard = {
  users: {
    total: number; // 비활성(탈퇴)까지 포함한 누적 — 사용자 목록 길이와 같다
    active: number;
    inactive: number;
    joinedToday: number; // KST 자정 기준
  };
  reports: {
    total: number;
    createdToday: number;
  };
  ai: {
    total: number;
    success: number;
    failed: number;
    processing: number;
    /** 끝난 호출(성공+실패) 중 성공 비율(%). 처리 중은 분모에서 빠진다. */
    successRate: number;
    /** 성공 호출 평균 소요시간(ms). 성공 건이 없으면 null → 화면은 "—" 로 둔다. */
    avgLatencyMs: number | null;
  };
  recentFailures: AdminAiLog[];
};

/** 대시보드 지표를 한 번에 가져온다. */
export function fetchDashboard(): Promise<AdminDashboard> {
  return apiGet<AdminDashboard>("/api/admin/dashboard");
}
