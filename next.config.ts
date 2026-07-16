import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 배포: standalone 서버 출력(.next/standalone → node server.js)
  output: "standalone",
  // nginx 뒤에서 /admin 하위 경로로 서빙 (service-web 은 / 루트). asset·라우팅이 /admin 접두사로 나감
  basePath: "/admin",
};

export default nextConfig;
