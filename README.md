# Bambi Admin Web

Bambi 관리자 화면. (사용자 서비스는 `bambi-service-web`)

## 실행

npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL 채우기
npm run dev                  # http://localhost:3001

포트 3001 고정 — service-web(3000)과 동시 실행 대비.

## 담당

- 화면: 소라
- scaffold / 공통 API client: 여진

## 스택

Next.js 16 (App Router) / TypeScript / Tailwind / no src dir