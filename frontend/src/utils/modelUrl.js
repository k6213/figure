/**
 * modelUrl.js
 * Meshy CDN URL → 백엔드 프록시 URL 변환 유틸리티.
 *
 * 이유: assets.meshy.ai 는 CORS 헤더가 없어 브라우저가 직접 GLB를 fetc할 수 없음.
 * 백엔드 /api/v1/generate3d/proxy-glb 가 서버 사이드에서 중계.
 */

/**
 * Meshy CDN URL이면 백엔드 프록시 경로로 변환, 아니면 원본 반환.
 * @param {string|null|undefined} url
 * @returns {string|null|undefined}
 */
export function toProxyUrl(url) {
  if (!url) return url
  if (url.includes('assets.meshy.ai')) {
    return `/api/v1/generate3d/proxy-glb?url=${encodeURIComponent(url)}`
  }
  return url
}
