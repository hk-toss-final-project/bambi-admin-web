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

/**
 * 로그 한 건의 상세 — 목록 필드에 요청·응답 본문을 더한다.
 * body 는 저장 원문 문자열(대개 JSON, agent 연결 실패 시 응답은 에러 평문일 수 있음).
 * 아직 처리 중이면 응답측 값(statusCode·respondedAt·responseBody)은 null 이다.
 */
export type AdminAiLogDetail = AdminAiLog & {
  statusCode: number | null; // agent 응답 HTTP 코드
  respondedAt: string | null; // 응답 기록 시각 (ISO)
  requestBody: string | null; // service → agent 요청 본문 원문
  responseBody: string | null; // agent → service 응답 본문 원문
};

/** 로그 한 건 상세를 가져온다. 없으면 공통 client 가 ApiError(NOT_FOUND) 로 throw 한다. */
export function fetchAiLogDetail(id: number): Promise<AdminAiLogDetail> {
  return apiGet<AdminAiLogDetail>(`/api/admin/ai-logs/${id}`);
}
