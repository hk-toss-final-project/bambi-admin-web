/**
 * 관리자 AI 처리 로그 — service-api 실연동.
 *
 * GET /api/admin/ai-logs (ADMIN). 필드는 백엔드 응답(AdminAiLogResponse)과 1:1이다.
 * 초기 목업엔 task·model·실패사유도 있었지만 ai_request_logs/ai_response_logs 스키마에 없어
 * 뺐다(endpoint 로 대체, 상태는 응답 status_code 로 파생).
 *
 * ⚠️ 로그 적재는 실제 AgentGateway(P1) 몫이라, 그전까지 이 목록은 비어 있다(정상 — Empty 상태로 뜸).
 */

import { apiGet } from "@/lib/api-client";

/** 처리 결과. PROCESSING = 응답 로그가 아직 없는, 진행 중인 요청. */
export type AiLogStatus = "SUCCESS" | "FAILED" | "PROCESSING";

/** 관리자 화면에 한 줄로 보이는 AI 처리 내역. */
export type AdminAiLog = {
  id: number;
  requestedAt: string; // 요청 시각 (ISO)
  userEmail: string | null; // 요청 사용자 (user_id 없으면 null)
  endpoint: string; // 호출한 agent 엔드포인트
  status: AiLogStatus;
  latencyMs: number | null; // 처리 중이면 null
};

/** 관리자용 AI 처리 로그를 최신순으로 가져온다. */
export function fetchAiLogs(): Promise<AdminAiLog[]> {
  return apiGet<AdminAiLog[]>("/api/admin/ai-logs");
}
