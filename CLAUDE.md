# CLAUDE.md — bambi-admin-web

> 이 문서는 **bambi-service-web에서 복사해온 공통 API client(`lib/` · `types/` · `constants/`)를 어떻게 쓰는가**만 다룬다.
> 원 출처: `bambi-service-web`의 CLAUDE.md (API 스펙은 백엔드 실측 기반, 검증일 2026-07-15).

---

## 1. API 응답 봉투

모든 Service API 응답은 공통 envelope을 따른다.

```ts
// types/api.ts
type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
};
```

```jsonc
// 성공
{ "success": true, "data": { /* ... */ }, "error": null }
// 실패
{ "success": false, "data": null, "error": { "code": "DUPLICATE_RESOURCE", "message": "..." } }
```

### 원칙 (MUST)

- **성공 판단은 HTTP status가 아니라 `payload.success`** 로 한다. 실패 시 `error.code`를 함께 확인한다.
- 서버 `error.message` 원문은 사용자에게 노출하지 않는다 (로깅·디버깅 전용). 사용자 문구는 `error.code` 기준으로 `constants/errors.ts` 매핑을 쓴다.
- `success: true`여도 `data`가 `null`/빈 배열일 수 있다. 호출부(화면)에서 Empty 상태를 처리한다.
- 모든 API 요청은 공통 client(`lib/api-client.ts`의 `request` / `apiGet` / `apiPost`)를 통과시킨다. 컴포넌트에서 `fetch` 직접 호출 금지. 실패는 `ApiError`(code 정규화됨)로 throw 된다.

## 2. 에러코드와 화면 처리 방침

코드명은 백엔드 enum(`bambi-service-api` ErrorCode.java)과 1:1이며, 문구 매핑의 단일 소스는 `constants/errors.ts`(`ERROR_MESSAGES` · `resolveErrorMessage`)다. 프론트에서 새 코드를 임의로 만들지 않는다.

| code | HTTP | 의미 | 화면 처리 |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | 요청값 검증 실패 | 해당 입력 필드 인라인 오류, 수정 후 재제출 |
| `AUTH_INVALID_CREDENTIALS` | 401 | 로그인 자격 증명 불일치 | 로그인 폼 인라인 안내, 수정 후 재제출 |
| `AUTH_INVALID_TOKEN` | 401 | 인증 없음/토큰 만료·무효 | **저장 토큰 제거** 후 로그인 화면 이동. 자동 재요청·무한 리다이렉트 금지 |
| `FORBIDDEN` | 403 | 권한 부족 | 접근 차단, 403 안내 화면 |
| `NOT_FOUND` | 404 | 리소스 없음 | Not Found / Empty State, 목록 복귀 경로 제공 |
| `DUPLICATE_RESOURCE` | 409 | 중복·충돌 | 사용자가 고칠 수 있게 인라인 안내 |
| `INTERNAL_ERROR` | 500 | 서버 오류 | Error State + 재시도 버튼 |

- 미정의/미상 코드는 `INTERNAL_ERROR`에 준해 처리한다 (`ApiError`가 자동 정규화, 문구는 `resolveErrorMessage`).
- `AUTH_INVALID_TOKEN` 시 공통 client가 저장 토큰을 제거한다. **리다이렉트는 상위(라우트 가드/레이아웃)의 책임**이며, 이미 로그인 페이지면 이동하지 않는다.

## 3. JWT / 인증

- JWT access token은 **`localStorage`** 에 저장한다. key는 **`bambi.accessToken`** — 문자열 리터럴을 흩뿌리지 말고 `constants/auth.ts`의 **`ACCESS_TOKEN_STORAGE_KEY`** 상수만 쓴다.
- 토큰 localStorage 접근은 `lib/token.ts`(`getAccessToken` / `setAccessToken` / `clearAccessToken`)로 한정한다.
- **토큰 주입(`Authorization: Bearer`)은 공통 client / 인증 유틸(`lib/api-client.ts` · `lib/auth.ts`)에서만 한다. 페이지·컴포넌트 개별 구현 금지.**
- 인증 API는 `lib/auth.ts`의 `login` / `signup` / `getMe` / `logout`을 쓴다. 토큰 저장·삭제 side-effect는 이 모듈에서만 발생한다.
- 공개 요청(login/signup 등)은 `{ auth: false }` 옵션으로 호출한다.

## 4. 환경변수

- **`NEXT_PUBLIC_API_URL`은 origin만 담는다 (`/api` 접두사 없음, 끝 슬래시 없음).** 예: `http://localhost`
- `/api`를 포함한 전체 경로는 호출부가 넘긴다 (예: `apiPost("/api/auth/login", ...)`) → 코드상 경로가 API 명세와 1:1.
- URL 조립은 공통 client(`getApiBaseUrl`) 1곳에서만 한다. 컴포넌트·유틸에서 `localhost`·IP·배포 도메인 하드코딩 금지. 환경변수 누락 시 client가 원인을 명시해 throw 한다.

---

- lib/, types/, constants/ 는 bambi-service-web에서 복사한 것. 원본 오너 = 여진. 여기서 직접 수정 금지 — 고칠 게 있으면 여진에게. (P0 이후 공유 패키지로 통합 예정)
- P0 admin 화면은 관리자 사용자 목록 · AI 처리 로그 2개. docs의 admin 목업 6종 중 나머지는 참고용. 화면 관련 규약은 @소라 추가 바람.
