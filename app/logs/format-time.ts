/**
 * AI 처리 로그 화면의 시각 표기 — 한국 시간 고정.
 *
 * 목록(page.tsx)과 상세 다이얼로그(log-detail-dialog.tsx)가 같은 문자열을 보여야 해서
 * 한 곳에 둔다. 두 파일이 같은 함수를 각자 들고 있다가 한쪽만 고쳐지는 걸 막는 목적이다.
 */

/** 운영·개발 어디서 렌더하든 이 시간대로 읽는다. */
const KST = "Asia/Seoul";

/**
 * 백엔드 ISO 시각을 한국 시간 `YYYY-MM-DD HH:mm` 으로.
 *
 * <p>예전엔 `iso.replace("T", " ").slice(0, 16)` 으로 문자열만 잘랐는데, 백엔드가
 * `OffsetDateTime` 을 컨테이너 시간대(UTC)로 직렬화하므로 화면에 **UTC 가 그대로** 찍혔다
 * (20:34 KST 요청이 11:34 로 보임).
 *
 * <p>`timeZone` 을 명시하면 서버에서 렌더하든 브라우저에서 렌더하든 결과가 같아서,
 * 문자열을 자르던 원래 의도(hydration 흔들림 회피)도 그대로 지켜진다.
 * `hourCycle: "h23"` 은 자정을 `24:00` 이 아니라 `00:00` 으로 만들기 위한 것이다.
 */
export function formatLogTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso; // 파싱 실패는 원문을 그대로 — 숨기지 않는다.

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
}
