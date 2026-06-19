/**
 * useMeshy.js
 * Meshy AI 3D 모델 생성 관련 React Query 훅
 *
 * useGenerationList()     — 내 작업 목록 (진행 중이면 5초마다 자동 갱신)
 * useGenerationStatus(id) — 단일 작업 실시간 폴링 (실제 progress % 반환)
 * useUploadAndStart()     — 이미지 업로드 + 생성 시작
 * useDeleteGeneration()   — 작업 삭제
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'

export const meshyKeys = {
  list:   ['meshy', 'list'],
  status: (id) => ['meshy', 'status', id],
}

// ── 목록 조회 ─────────────────────────────────────────────────────────────────
export function useGenerationList() {
  return useQuery({
    queryKey: meshyKeys.list,
    queryFn: async () => {
      const { data } = await api.get('/generate3d?limit=20&offset=0')
      if (Array.isArray(data)) return data
      return data.generations ?? data.results ?? []
    },
    refetchInterval: (query) => {
      const list = query.state.data ?? []
      const hasActive = list.some(
        (g) => g.state === 'queued' || g.state === 'dreaming'
      )
      return hasActive ? 5_000 : false
    },
    staleTime: 3_000,
  })
}

// ── 단일 작업 폴링 (실제 progress % 포함) ────────────────────────────────────
export function useGenerationStatus(generationId) {
  return useQuery({
    queryKey: meshyKeys.status(generationId),
    queryFn: async () => {
      const { data } = await api.get(`/generate3d/${generationId}/status`)
      return data  // { status, progress(0~100), assets }
    },
    enabled: Boolean(generationId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 4_000
    },
    staleTime: 2_000,
  })
}

// ── 업로드 + 생성 시작 ────────────────────────────────────────────────────────
export function useUploadAndStart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file }) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/generate3d/upload-and-start', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meshyKeys.list })
    },
  })
}

// ── 삭제 ─────────────────────────────────────────────────────────────────────
export function useDeleteGeneration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (generationId) => {
      await api.delete(`/generate3d/${generationId}`)
      return generationId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meshyKeys.list })
    },
  })
}

