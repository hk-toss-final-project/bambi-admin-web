/**
 * 관리자 사용자 목록 — 임시 mock 데이터.
 *
 * 사용자 목록 API(우석·영현 도메인)가 아직 없어서, 화면을 먼저 만들려고 둔 가짜 데이터다.
 * 나중에 실제 API가 나오면 `fetchAdminUsers` 본문만 apiGet 호출로 바꾸면 된다.
 * 화면 쪽 코드는 이 함수만 부르므로, 여기만 교체하면 화면은 손댈 필요가 없다.
 */

/** 관리자 화면에서 보는 사용자 한 명. (인증용 User 와 별개로, 목록 표시에 필요한 필드만) */
export type AdminUser = {
  id: number;
  displayName: string;
  email: string;
  joinedAt: string; // 가입일 (YYYY-MM-DD)
  plan: "FREE" | "PRO";
  status: "ACTIVE" | "INACTIVE";
  lastActive: string; // 최근 활동 (예: "2시간 전") — 표시용 문자열
  publicBriefings: number; // 공개 브리핑 수
};

const MOCK_USERS: AdminUser[] = [
  {
    id: 1,
    displayName: "김여진",
    email: "yeojin@example.com",
    joinedAt: "2026-03-12",
    plan: "FREE",
    status: "ACTIVE",
    lastActive: "2시간 전",
    publicBriefings: 4,
  },
  {
    id: 2,
    displayName: "FX Daily",
    email: "fxdaily@example.com",
    joinedAt: "2026-03-02",
    plan: "PRO",
    status: "ACTIVE",
    lastActive: "14분 전",
    publicBriefings: 18,
  },
  {
    id: 3,
    displayName: "Market Note",
    email: "marketnote@example.com",
    joinedAt: "2026-04-21",
    plan: "FREE",
    status: "ACTIVE",
    lastActive: "1일 전",
    publicBriefings: 9,
  },
  {
    id: 4,
    displayName: "Macro Brief",
    email: "macrobrief@example.com",
    joinedAt: "2026-05-03",
    plan: "FREE",
    status: "INACTIVE",
    lastActive: "3주 전",
    publicBriefings: 12,
  },
];

/**
 * 관리자용 사용자 목록을 가져온다.
 *
 * 지금은 mock 을 그대로 돌려주지만, 실제 API 처럼 Promise 로 만들어 둬서
 * 화면의 로딩 상태 흐름은 진짜와 똑같이 굴러간다. 교체 시엔 아래 한 줄만 바꾸면 된다:
 *   return apiGet<AdminUser[]>("/api/admin/users");
 */
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return MOCK_USERS;
}
