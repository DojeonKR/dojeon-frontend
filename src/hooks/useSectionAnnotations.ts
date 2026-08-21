import { useQuery } from '@tanstack/react-query'
import { fetchSectionAnnotations, SectionApiError } from '../services/section.service.ts'
import type { SectionAnnotationsData } from '../types/annotation.types.ts'

interface UseSectionAnnotationsState {
    data: SectionAnnotationsData | null
    loading: boolean
    error: SectionApiError | null
}

// MARK VOCAB / MARK GRAMMAR 용 annotation. 프리뷰 섹션(음수 id)에서는 호출하지 않는다.
export function useSectionAnnotations(sectionId: number | null): UseSectionAnnotationsState {
    const enabled = sectionId !== null && sectionId > 0
    const { data, isPending, isFetching, error } = useQuery<
        SectionAnnotationsData | null,
        SectionApiError
    >({
        queryKey: ['section', sectionId, 'annotations'],
        queryFn: ({ signal }) => {
            if (sectionId === null) return null
            return fetchSectionAnnotations(sectionId, signal)
        },
        enabled,
    })

    return {
        data: data ?? null,
        loading: enabled && (isPending || isFetching),
        error: error ?? null,
    }
}
