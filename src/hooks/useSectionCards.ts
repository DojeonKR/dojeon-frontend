import { useQuery } from '@tanstack/react-query'
import { fetchSectionCards, SectionApiError } from '../services/section.service.ts'
import type { SectionCardData } from '../types/section,types.ts'

interface UseSectionCardsState {
    data: SectionCardData | null
    loading: boolean
    error: SectionApiError | null
    refetch: () => Promise<void>
}

// 음수 sectionId 는 API 응답이 없을 때 화면들이 쓰는 preview/mock 식별자다.
// 그대로 조회하면 반드시 실패하는 요청을 날리고 그동안 "Loading cards..." 만 보이므로 아예 건너뛴다.
const isFetchableSection = (sectionId: number | null): sectionId is number =>
    sectionId !== null && sectionId >= 0

export function useSectionCards(sectionId: number | null): UseSectionCardsState {
    const enabled = isFetchableSection(sectionId)
    const { data, isPending, isFetching, error, refetch } = useQuery<
        SectionCardData | null,
        SectionApiError
    >({
        queryKey: ['section', sectionId, 'cards'],
        queryFn: ({ signal }) => {
            if (!isFetchableSection(sectionId)) return null
            return fetchSectionCards(sectionId, signal)
        },
        enabled,
    })

    return {
        data: data ?? null,
        // enabled:false 인 쿼리는 isPending 이 계속 true 라서 조회 대상일 때만 로딩으로 본다.
        loading: enabled && (isPending || isFetching),
        error: error ?? null,
        refetch: async () => {
            if (!enabled) return
            await refetch()
        },
    }
}
