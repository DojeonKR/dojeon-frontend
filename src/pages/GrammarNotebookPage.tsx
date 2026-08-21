import { useEffect, useRef, useState } from 'react'
import './GrammarNotebookPage.css'
import { useGrammarScraps } from '../hooks/useGrammarScraps.ts'
import { useSectionMaterials } from '../hooks/useSectionMaterials.ts'
import type { GrammarScrapItem } from '../types/scraps.types.ts'
import {
  contentTextDirection,
  pickContentExplanation,
  pickDialogueTranslation,
  toContentLanguage,
  type ContentLanguage,
} from '../data/contentLanguage.ts'

interface GrammarNotebookPageProps {
  language: string
  onBack: () => void
}

const previewGrammarScraps: GrammarScrapItem[] = [
  {
    scrapId: 'preview-grammar-1',
    sectionId: 5,
    targetType: 'GRAMMAR',
    courseTitle: 'Course 1',
    lessonTitle: 'lesson 5',
    grammarPoint: '-을까요?',
    createdAt: '2026-06-08T00:00:00.000Z',
  },
  {
    scrapId: 'preview-grammar-2',
    sectionId: 6,
    targetType: 'GRAMMAR',
    courseTitle: 'Course 1',
    lessonTitle: 'lesson 6',
    grammarPoint: '-고 싶어요',
    createdAt: '2026-06-08T00:00:00.000Z',
  },
  {
    scrapId: 'preview-grammar-3',
    sectionId: 7,
    targetType: 'GRAMMAR',
    courseTitle: 'Course 2',
    lessonTitle: 'lesson 1',
    grammarPoint: '-아/어요',
    createdAt: '2026-06-08T00:00:00.000Z',
  },
]

function GrammarNotebookPage({ language, onBack }: GrammarNotebookPageProps) {
  const contentLanguage = toContentLanguage(language)
  const [isRecentSort, setIsRecentSort] = useState(true)
  const [selectedScrap, setSelectedScrap] = useState<GrammarScrapItem | null>(null)
  const { items, loading, loadingMore, hasMore, error, fetchNextPage, refetch } =
    useGrammarScraps()
  const visibleItems = import.meta.env.DEV && items.length === 0 ? previewGrammarScraps : items
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    if (!hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && !loadingMore) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, fetchNextPage])

  const handleBackPress = () => {
    if (selectedScrap) {
      setSelectedScrap(null)
      return
    }

    onBack()
  }

  return (
    <main className="grammar-notebook-screen">
      <section className="grammar-notebook-content">
        <header className="grammar-notebook-header">
          <button
            type="button"
            className="grammar-notebook-back"
            onClick={handleBackPress}
            aria-label="Go back"
          >
            <svg
              className="grammar-notebook-back-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="grammar-notebook-title">
            {selectedScrap ? 'Grammar note' : 'Grammar'}
          </h1>
        </header>

        {selectedScrap ? (
          <GrammarDetail scrap={selectedScrap} contentLanguage={contentLanguage} />
        ) : (
          <>
            <div className="grammar-notebook-sort-row">
              <button
                type="button"
                className="grammar-notebook-sort-button"
                onClick={() => setIsRecentSort((prev) => !prev)}
                aria-label="Sort"
              >
                <span>Recently viewed</span>
                <svg
                  className={`grammar-notebook-sort-icon ${
                    isRecentSort ? 'is-recent' : 'is-alt'
                  }`}
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4.5 6.75L9 11.25L13.5 6.75"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {loading ? (
              <p className="grammar-notebook-status">Loading...</p>
            ) : error && visibleItems.length === 0 ? (
              <div className="notebook-empty-state">
                <p>Grammar sync unavailable.</p>
                <button type="button" onClick={() => void refetch()}>
                  Retry sync
                </button>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="notebook-empty-state">
                <p>No grammar scraps yet.</p>
                {error ? (
                  <button type="button" onClick={() => void refetch()}>
                    Retry sync
                  </button>
                ) : null}
              </div>
            ) : (
              <section className="grammar-notebook-card-list">
                {visibleItems.map((scrap) => (
                  <article
                    key={scrap.scrapId}
                    className="grammar-notebook-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedScrap(scrap)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedScrap(scrap)
                      }
                    }}
                  >
                    <div className="grammar-notebook-card-top">
                      <p className="grammar-notebook-course">{scrap.courseTitle}</p>
                      <span className="grammar-notebook-badge">{scrap.lessonTitle}</span>
                    </div>
                    <div className="grammar-notebook-card-bottom">
                      <p className="grammar-notebook-topic">{scrap.grammarPoint}</p>
                    </div>
                    <svg
                      className="grammar-notebook-arrow"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6.75 4.5L11.25 9L6.75 13.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </article>
                ))}

                {hasMore && <div ref={sentinelRef} className="grammar-notebook-sentinel" />}

                {loadingMore && (
                  <p className="grammar-notebook-status">Loading more...</p>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function GrammarDetail({
  scrap,
  contentLanguage,
}: {
  scrap: GrammarScrapItem
  contentLanguage: ContentLanguage
}) {
  const { data, loading } = useSectionMaterials(scrap.sectionId)
  const material = data?.materials.find((item) => item.type === 'GRAMMAR_TABLE') ?? data?.materials[0]
  const content = material?.contentText
  // 모든 언어를 나열하지 않고 mother language에 해당하는 설명만 보여준다.
  const explanation = pickContentExplanation(content, contentLanguage)
  const dialogues = content?.dialogues ?? []
  const translationDir = contentTextDirection(contentLanguage)

  return (
    <section className="grammar-notebook-detail">
      <article className="grammar-notebook-detail-hero">
        <div className="grammar-notebook-card-top">
          <p className="grammar-notebook-course">{scrap.courseTitle}</p>
          <span className="grammar-notebook-badge">{scrap.lessonTitle}</span>
        </div>
        <h2 className="grammar-notebook-detail-title">
          {content?.title || scrap.grammarPoint}
        </h2>
      </article>

      <article className="grammar-notebook-detail-card">
        <p className="grammar-notebook-detail-label">Grammar</p>
        {loading ? (
          <p className="grammar-notebook-detail-copy">Loading...</p>
        ) : explanation ? (
          <div className="grammar-notebook-detail-stack">
            <p
              className="grammar-notebook-detail-copy"
              dir={contentTextDirection(toContentLanguage(explanation.lang))}
            >
              {explanation.text}
            </p>
          </div>
        ) : (
          <p className="grammar-notebook-detail-copy">
            Review this saved grammar point from your personal notebook.
          </p>
        )}
      </article>

      <article className="grammar-notebook-detail-card">
        <p className="grammar-notebook-detail-label">Course</p>
        <p className="grammar-notebook-detail-copy">
          {scrap.courseTitle} / {scrap.lessonTitle}
        </p>
      </article>

      {dialogues.length > 0 ? (
        <article className="grammar-notebook-detail-card">
          <p className="grammar-notebook-detail-label">Examples</p>
          <div className="grammar-notebook-dialogue-list">
            {dialogues.flatMap((dialogue, dialogueIndex) =>
              dialogue.lines.map((line, lineIndex) => {
                // mother language 번역이 없으면 다른 언어로 폴백하지 않고 원문만 보여 준다.
                const translation = pickDialogueTranslation(line, contentLanguage)
                return (
                  <div
                    key={`${dialogueIndex}-${lineIndex}-${line.ko}`}
                    className="grammar-notebook-dialogue-line"
                  >
                    <span className="grammar-notebook-dialogue-speaker">{line.speaker}</span>
                    <div>
                      <p className="grammar-notebook-dialogue-ko">{line.ko}</p>
                      {translation.length > 0 ? (
                        <p className="grammar-notebook-dialogue-translation" dir={translationDir}>
                          {translation}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              }),
            )}
          </div>
        </article>
      ) : null}
    </section>
  )
}

export default GrammarNotebookPage
