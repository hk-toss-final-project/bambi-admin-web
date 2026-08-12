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
    /**
     * 성공 호출 평균 **HTTP 왕복**(ms). 성공 건이 없으면 null → 화면은 "—" 로 둔다.
     *
     * ⚠️ AI 처리 시간이 아니다. 생성 요청은 agent 가 202 로 즉시 응답하므로 수십 ms 로 나온다.
     * 리포트가 실제로 몇 분 걸리는지는 {@link AdminDashboard.generations} 를 봐야 한다.
     */
    avgLatencyMs: number | null;
  };
  /**
   * 리포트 생성 수명주기 — 접수(PENDING)부터 카드 발행(COMPLETED)까지.
   *
   * AI 호출 지표로는 큐가 밀렸는지 알 수 없다(생성 요청은 202 로 바로 성공 처리된다).
   * 운영에서 리포트가 20분씩 걸린 날 대시보드가 정상으로 보였던 이유가 그것이다.
   */
  generations: {
    /** 최근(2시간 내) 접수 중 아직 안 끝난 것 = 실제로 처리되고 있는 건. */
    inProgress: number;
    /**
     * 2시간을 넘겨 미종료로 남은 것 = **사람이 봐야 하는 것**.
     *
     * 진행 중과 갈라야 한다. 미종료를 전부 "진행 중"으로 셌더니 운영에서 102건이 나왔는데
     * 전부 2~5일 묵은 PUBLISHING 고아였다 — "밀렸지만 돌아간다"로 읽혀 정반대 인상을 준다.
     */
    stalled: number;
    completedToday: number;
    failedToday: number;
    /**
     * 오늘 완료분 **중앙값** 소요(초). 큐 대기 포함 = 사용자 체감. 완료 건 없으면 null.
     * 평균이 아니다 — 실측에서 5시간 45분짜리 한 건이 평균을 16분으로 끌어올렸다(중앙값 8분 48초).
     */
    medianSeconds: number | null;
    /** 오늘 완료분 최장 소요(초). 중앙값만 보면 꼬리가 안 보인다. */
    maxSeconds: number | null;
  };
  recentFailures: AdminAiLog[];
};

/** 대시보드 지표를 한 번에 가져온다. */
export function fetchDashboard(): Promise<AdminDashboard> {
  return apiGet<AdminDashboard>("/api/admin/dashboard");
}
