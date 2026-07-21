/**
 * 관리자 AI 처리 로그 — 임시 mock.
 *
 * 실제 Agent Gateway(P1)가 붙기 전에 화면부터 검증하려고 둔 가짜 로그다.
 * 나중엔 service-db의 `ai_request_logs`·`ai_response_logs`를 엮어 내려줄 값이라,
 * 여기 필드도 그 두 테이블에서 실제로 뽑을 수 있는 것만 골라 뒀다. (요청 시각·사용자·
 * 작업 종류는 request 쪽, 상태·소요시간·실패 사유는 response 쪽)
 * API가 나오면 `fetchAiLogs` 본문만 apiGet 호출로 바꾸면 화면은 손댈 필요가 없다.
 */

/** 처리 결과. PROCESSING = 아직 응답 로그가 안 쌓인, 진행 중인 요청. */
export type AiLogStatus = "SUCCESS" | "FAILED" | "PROCESSING";

/**
 * 관리자 화면에 한 줄로 보이는 AI 처리 내역. (request+response를 조인한 뷰라
 * DB 테이블과 1:1은 아니고, 관리자가 한눈에 볼 것만 추린 모양이다.)
 */
export type AdminAiLog = {
  id: number;
  requestedAt: string; // 요청 시각 (표시용 문자열)
  userEmail: string; // 어떤 사용자의 요청이었는지
  task: "북마크 요약" | "카드 생성"; // AgentClient 의 두 호출과 대응
  model: string; // 지금은 "mock", 실제 LLM 연동 후엔 모델명(gpt-4.1-mini 등)
  status: AiLogStatus;
  latencyMs: number | null; // 완료까지 걸린 시간. 아직 처리 중이면 null
  failureReason: string | null; // FAILED 일 때만 사유. 관리자가 원인을 바로 보게
};

// 세 가지 상태가 다 한 번씩은 보이도록 섞어 뒀다 — 배지 색·소요시간 "—" 처리·
// 실패 사유 노출을 화면에서 바로 눈으로 확인하려는 의도.
const MOCK_LOGS: AdminAiLog[] = [
  {
    id: 1042,
    requestedAt: "2026-07-21 09:12",
    userEmail: "yeojin@example.com",
    task: "카드 생성",
    model: "mock",
    status: "SUCCESS",
    latencyMs: 820,
    failureReason: null,
  },
  {
    id: 1041,
    requestedAt: "2026-07-21 09:10",
    userEmail: "fxdaily@example.com",
    task: "북마크 요약",
    model: "mock",
    status: "PROCESSING",
    latencyMs: null,
    failureReason: null,
  },
  {
    id: 1040,
    requestedAt: "2026-07-21 08:57",
    userEmail: "marketnote@example.com",
    task: "카드 생성",
    model: "mock",
    status: "FAILED",
    latencyMs: 3120,
    failureReason: "Agent 응답 시간 초과 (timeout)",
  },
  {
    id: 1039,
    requestedAt: "2026-07-21 08:44",
    userEmail: "yeojin@example.com",
    task: "북마크 요약",
    model: "mock",
    status: "SUCCESS",
    latencyMs: 640,
    failureReason: null,
  },
  {
    id: 1038,
    requestedAt: "2026-07-21 08:30",
    userEmail: "macrobrief@example.com",
    task: "카드 생성",
    model: "mock",
    status: "SUCCESS",
    latencyMs: 910,
    failureReason: null,
  },
];

/**
 * 관리자용 AI 처리 로그를 최신순으로 가져온다.
 * mock 이지만 실제 API처럼 Promise로 감싸, 화면의 로딩 흐름은 진짜와 똑같이 돈다.
 * 교체 시엔 아래 한 줄이면 된다:
 *   return apiGet<AdminAiLog[]>("/api/admin/ai-logs");
 */
export async function fetchAiLogs(): Promise<AdminAiLog[]> {
  return MOCK_LOGS;
}
