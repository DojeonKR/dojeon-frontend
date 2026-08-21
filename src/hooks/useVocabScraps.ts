import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchScrapList, ScrapApiError } from '../services/scrap.service.ts'
import type { VocabScrapListData, VocabScrapGroup } from '../types/scraps.types.ts'

/**
 * 목록 API는 스크랩 단위로 페이징되므로 같은 코스가 여러 페이지에 걸쳐 내려온다.
 * courseId로 합쳐 주지 않으면 같은 코스가 카드 여러 개로 쪼개지고 단어 개수도 나뉘어 보인다.
 */
function mergeGroupsByCourse(pages: (VocabScrapListData | null)[]): VocabScrapGroup[] {
    const merged = new Map<number, VocabScrapGroup>()
    const seenScrapIds = new Set<string>()

    for (const page of pages) {
        for (const group of page?.groups ?? []) {
            let target = merged.get(group.courseId)
            if (!target) {
                target = { ...group, items: [] }
                merged.set(group.courseId, target)
            }

            for (const item of group.items) {
                // 페이지 경계에서 같은 스크랩이 다시 내려오는 경우를 걸러낸다.
                if (seenScrapIds.has(item.scrapId)) continue
                seenScrapIds.add(item.scrapId)
                target.items.push(item)
            }
        }
    }

    return [...merged.values()]
}

interface UseVocabScrapsState {
    groups: VocabScrapGroup[]
    loading: boolean
    loadingMore: boolean
    hasMore: boolean
    error: ScrapApiError | null
    fetchNextPage: () => void
    refetch: () => Promise<void>
}

export function useVocabScraps(limit = 20): UseVocabScrapsState {
    const {
        data,
        isPending,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        error,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['scrap', 'list', 'VOCAB', limit] as const,
        queryFn: async ({
            pageParam,
            signal,
        }: {
            pageParam: string | undefined
            signal?: AbortSignal
        }): Promise<VocabScrapListData | null> => {
            const result = await fetchScrapList(
                {
                    type: 'VOCAB',
                    sort: 'recent',
                    cursor: pageParam,
                    limit: String(limit),
                },
                signal,
            )
            return result as VocabScrapListData | null
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    })

    const groups = mergeGroupsByCourse(data?.pages ?? [])

    return {
        groups,
        loading: isPending,
        loadingMore: isFetchingNextPage,
        hasMore: hasNextPage ?? false,
        error: (error as ScrapApiError | null) ?? null,
        fetchNextPage: () => {
            void fetchNextPage()
        },
        refetch: async () => {
            await refetch()
        },
    }
}