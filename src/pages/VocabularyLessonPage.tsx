import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import characterImage from '../assets/character.png'
import './VocabularyLessonPage.css'
import { useSectionCards } from '../hooks/useSectionCards.ts'
import { useCreateScrap } from '../hooks/useCreateScrap.ts'
import { useDeleteScrap } from '../hooks/useDeleteScrap.ts'
import { useSaveSectionProgress } from '../hooks/useSaveSectionProgress.ts'
import { useSectionPageTimer } from '../hooks/useSectionPageTimer.ts'
import {
  contentTextDirection,
  pickLocaleText,
  toContentLanguage,
} from '../data/contentLanguage.ts'

interface VocabularyLessonPageProps {
  language: string
  sectionId: number | null
  initialView?: VocabularyLessonView
  initialCardIndex?: number
  /**
   * annotation 팝업의 GO TO LESSON 으로 들어왔을 때 target.cardId.
   * 해당 단어 카드부터 보여준다. 그 카드가 이 섹션에 없으면 무시한다.
   */
  initialCardId?: number | null
  /** 수업 내부 한 단계 뒤로. 되돌아갈 단계가 없으면 수업 밖으로 나간다. */
  onBack: () => void
  /** 수업을 완전히 종료하고 수업 목록으로 나간다. */
  onExit: () => void
  onOpenFlashcardPractice: () => void
  onOpenNextGrammar: (sectionId?: number | null) => void
  /**
   * annotation 팝업의 GO TO LESSON 으로 열린 화면인지 여부.
   * target.mode 가 EXPLANATION_ONLY 면 하단 BACK/NEXT 를 비활성화한다.
   */
  explanationOnly?: boolean
}

type VocabularyLessonView = 'intro' | 'card' | 'table' | 'flashcards'
type PersonalListPromptSource = 'card' | 'table'

interface PersonalListPrompt {
  wordId: number
  source: PersonalListPromptSource
}

const swipeThreshold = 40
const cardWidth = 278
const cardGap = 14
const fallbackVocabularyItems = [
  {
    id: -1,
    word: '나무',
    meaning: 'Tree',
    note: 'tree',
    audioUrl: null,
  },
  {
    id: -2,
    word: '생신',
    meaning: 'Birthday',
    note: '생일의 높임말',
    audioUrl: null,
  },
  {
    id: -3,
    word: '꽃',
    meaning: 'Flower',
    note: 'flower',
    audioUrl: null,
  },
]

function VocabularyLessonPage({
  language,
  sectionId,
  initialView = 'intro',
  initialCardIndex = 0,
  initialCardId = null,
  onBack,
  onExit,
  onOpenFlashcardPractice,
  onOpenNextGrammar,
  explanationOnly = false,
}: VocabularyLessonPageProps) {
  const contentLanguage = toContentLanguage(language)
  const translationDir = contentTextDirection(contentLanguage)
  const { data: cardsData, loading: cardsLoading } = useSectionCards(sectionId)
  const createScrapMutation = useCreateScrap()
  const deleteScrapMutation = useDeleteScrap()
  const saveProgress = useSaveSectionProgress()

  const [view, setView] = useState<VocabularyLessonView>(initialView)
  // null 이면 아직 사용자가 카드를 옮기지 않은 상태라, 아래에서 목적지/초기값으로 유도한다.
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [flippedWordIds, setFlippedWordIds] = useState<number[]>([])
  const [optimisticAdded, setOptimisticAdded] = useState<number[]>([])
  const [optimisticRemoved, setOptimisticRemoved] = useState<number[]>([])
  const [optimisticScrapIds, setOptimisticScrapIds] = useState<Record<number, string>>({})
  const [pendingScrapWordIds, setPendingScrapWordIds] = useState<number[]>([])
  const [personalListPrompt, setPersonalListPrompt] = useState<PersonalListPrompt | null>(null)
  const [expandedTableWordIds, setExpandedTableWordIds] = useState<number[]>([])
  const pointerStartRef = useRef<{ pointerId: number; clientX: number } | null>(null)
  const shouldIgnoreCardClickRef = useRef(false)
  const promptCancelButtonRef = useRef<HTMLButtonElement | null>(null)

  // Base scrap state derived directly from API data (no useEffect)
  const baseScrapedIds = useMemo(
    () => (cardsData?.cards ?? []).filter((c) => c.isScraped).map((c) => c.id),
    [cardsData],
  )
  const baseScrapIdMap = useMemo(() => {
    const map: Record<number, string> = {}
    for (const card of cardsData?.cards ?? []) {
      if (card.isScraped && card.scrapId) map[card.id] = card.scrapId
    }
    return map
  }, [cardsData])

  // Merge API state with optimistic overrides
  const personalListIds = useMemo(() => {
    const merged = new Set([
      ...baseScrapedIds.filter((id) => !optimisticRemoved.includes(id)),
      ...optimisticAdded,
    ])
    return Array.from(merged)
  }, [baseScrapedIds, optimisticAdded, optimisticRemoved])
  const scrapIdByCardId = useMemo(
    () => ({ ...baseScrapIdMap, ...optimisticScrapIds }),
    [baseScrapIdMap, optimisticScrapIds],
  )

  const vocabularyItems = useMemo(
    () => {
      const cards = cardsData?.cards ?? []
      if (cards.length === 0) return fallbackVocabularyItems

      return cards.map((card) => ({
        id: card.id,
        word: card.wordFront,
        // 뜻/노트는 mother language 로케일을 우선 사용하고 없으면 기본값으로 폴백한다.
        meaning: pickLocaleText(card.locales, contentLanguage, 'back') ?? card.wordBack,
        note: pickLocaleText(card.locales, contentLanguage, 'notes') ?? card.notes ?? '',
        audioUrl: card.audioUrl,
      }))
    },
    [cardsData, contentLanguage],
  )

  // GO TO LESSON 으로 들어왔으면 target.cardId 에 해당하는 카드부터 보여준다.
  // 카드가 아직 로딩 중이거나 그 카드가 이 섹션에 없으면 초기 인덱스로 폴백한다.
  const targetCardIndex = useMemo(() => {
    if (initialCardId === null) return null
    const index = vocabularyItems.findIndex((item) => item.id === initialCardId)
    return index >= 0 ? index : null
  }, [initialCardId, vocabularyItems])

  const defaultCardIndex = targetCardIndex ?? Math.max(0, initialCardIndex)
  const currentCardIndex = selectedCardIndex ?? defaultCardIndex

  const setCurrentCardIndex = (next: number | ((current: number) => number)) => {
    setSelectedCardIndex((current) =>
      typeof next === 'function' ? next(current ?? defaultCardIndex) : next,
    )
  }

  useSectionPageTimer({
    sectionId,
    pageNumber: currentCardIndex,
    enabled: !cardsLoading && view === 'card' && vocabularyItems.length > 0,
  })

  const currentCard = vocabularyItems[currentCardIndex]
  const hasPreviousCard = currentCardIndex > 0
  const hasNextCard = currentCardIndex < vocabularyItems.length - 1
  const carouselEntries = [
    { id: 'placeholder-start', type: 'placeholder' as const },
    ...vocabularyItems.map((item, index) => ({ id: item.id, type: 'word' as const, item, index })),
    { id: 'placeholder-end', type: 'placeholder' as const },
  ]

  const handleSpeakCurrentWord = () => {
    if (!currentCard) return

    if (currentCard.audioUrl) {
      const audio = new Audio(currentCard.audioUrl)
      void audio.play()
      return
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(currentCard.word)
    utterance.lang = 'ko-KR'
    utterance.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  // 하단 BACK 전용 핸들러: 수업 내부의 이전 단계로만 이동한다.
  // 상단 화살표는 onExit으로 분리되어 항상 수업을 종료한다.
  const handleBackPress = () => {
    if (view === 'flashcards') {
      setView('card')
      return
    }

    onBack()
  }

  const toggleFlip = (wordId: number) => {
    setFlippedWordIds((current) =>
      current.includes(wordId) ? current.filter((id) => id !== wordId) : [...current, wordId],
    )
  }

  const handleTogglePersonalList = async (wordId: number) => {
    if (pendingScrapWordIds.includes(wordId)) return

    const isSaved = personalListIds.includes(wordId)
    setPendingScrapWordIds((prev) => [...prev, wordId])

    try {
      if (wordId < 0) {
        if (isSaved) {
          setOptimisticRemoved((prev) => [...prev, wordId])
          setOptimisticAdded((prev) => prev.filter((id) => id !== wordId))
        } else {
          setOptimisticRemoved((prev) => prev.filter((id) => id !== wordId))
          setOptimisticAdded((prev) => [...prev, wordId])
        }
        return
      }

      if (isSaved) {
        const scrapId = scrapIdByCardId[wordId]
        if (!scrapId) return
        setOptimisticRemoved((prev) => [...prev, wordId])
        setOptimisticAdded((prev) => prev.filter((id) => id !== wordId))
        try {
          await deleteScrapMutation.mutateAsync(scrapId)
        } catch {
          setOptimisticRemoved((prev) => prev.filter((id) => id !== wordId))
        }
      } else {
        if (sectionId === null) return
        setOptimisticAdded((prev) => [...prev, wordId])
        try {
          const result = await createScrapMutation.mutateAsync({
            type: 'VOCAB',
            cardId: wordId,
            sectionId,
          })
          if (result?.id) {
            setOptimisticScrapIds((prev) => ({ ...prev, [wordId]: result.id }))
          }
        } catch {
          setOptimisticAdded((prev) => prev.filter((id) => id !== wordId))
        }
      }
    } finally {
      setPendingScrapWordIds((prev) => prev.filter((id) => id !== wordId))
    }
  }

  const moveCard = (direction: 'prev' | 'next') => {
    setCurrentCardIndex((current) => {
      if (direction === 'prev') {
        return Math.max(current - 1, 0)
      }
      return Math.min(current + 1, vocabularyItems.length - 1)
    })
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveCard('prev')
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveCard('next')
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (currentCard) toggleFlip(currentCard.id)
    }
  }

  const toggleTableWord = (wordId: number) => {
    setExpandedTableWordIds((current) =>
      current.includes(wordId)
        ? current.filter((id) => id !== wordId)
        : [...current, wordId],
    )
  }

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary) return

    pointerStartRef.current = { pointerId: event.pointerId, clientX: event.clientX }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const pointerStart = pointerStartRef.current
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) return

    const deltaX = event.clientX - pointerStart.clientX
    pointerStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (Math.abs(deltaX) < swipeThreshold) return

    shouldIgnoreCardClickRef.current = true
    window.setTimeout(() => {
      shouldIgnoreCardClickRef.current = false
    }, 0)
    if (deltaX <= -swipeThreshold) moveCard('next')
    if (deltaX >= swipeThreshold) moveCard('prev')
  }

  const handleCurrentCardClick = (wordId: number) => {
    if (shouldIgnoreCardClickRef.current) {
      shouldIgnoreCardClickRef.current = false
      return
    }

    toggleFlip(wordId)
  }

  const handleOpenNextGrammar = async () => {
    if (saveProgress.isPending) return

    if (sectionId === null || sectionId < 0) {
      onOpenNextGrammar()
      return
    }

    try {
      const result = await saveProgress.mutateAsync({
        sectionId,
        payload: {
          currentPage: Math.max(1, vocabularyItems.length),
          stayTimeSeconds: 0,
          isCompleted: true,
        },
      })
      const nextGrammarSectionId =
        result?.nextSection?.type === 'GRAMMAR' ? result.nextSection.sectionId : null
      onOpenNextGrammar(nextGrammarSectionId)
    } catch {
      onOpenNextGrammar(null)
    }
  }

  const title =
    view === 'intro'
      ? 'Vocabulary lesson'
      : view === 'flashcards'
        ? 'Flashcards game'
        : 'This lesson’s words'

  const promptWord =
    personalListPrompt === null
      ? null
      : vocabularyItems.find((item) => item.id === personalListPrompt.wordId) ?? null
  const promptWordSaved = promptWord ? personalListIds.includes(promptWord.id) : false
  const isPromptWordPending = promptWord ? pendingScrapWordIds.includes(promptWord.id) : false
  const promptCopy =
    personalListPrompt?.source === 'card'
      ? promptWordSaved
        ? 'Do you want to remove this word from your personal list?'
        : 'Do you want to add this word to your personal list?'
      : promptWordSaved
        ? 'Do you want to remove it from your personal list?'
        : 'Do you want to add it to your personal list?'

  useEffect(() => {
    if (promptWord) promptCancelButtonRef.current?.focus()
  }, [promptWord])

  const renderPersonalListIcon = (isSaved: boolean) => {
    if (isSaved) {
      return (
        <svg
          className="vocabulary-lesson-main-card-note-icon"
          width="23"
          height="25"
          viewBox="0 0 23 25"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5.125 2.25H14.875L19.375 6.75V20.25C19.375 21.4926 18.3676 22.5 17.125 22.5H5.125C3.88236 22.5 2.875 21.4926 2.875 20.25V4.5C2.875 3.25736 3.88236 2.25 5.125 2.25Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M14.875 2.25V6.75H19.375"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M7.375 13.5H14.875"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      )
    }

    return (
      <svg
        className="vocabulary-lesson-main-card-note-icon"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="16" cy="16" r="16" fill="currentColor" opacity="0.22" />
        <path
          d="M16 9.5V22.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9.5 16H22.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <main className="vocabulary-lesson-screen">
      <section
        className={`vocabulary-lesson-content ${
          view === 'intro' ? '' : 'vocabulary-lesson-content-study'
        }`}
      >
        <header className="vocabulary-lesson-header">
          <button
            type="button"
            className="vocabulary-lesson-back"
            onClick={onExit}
            aria-label="Exit lesson"
          >
            <svg
              className="vocabulary-lesson-back-icon"
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
          <h1 className="vocabulary-lesson-title">{title}</h1>
        </header>

        {view === 'intro' ? (
          <section className="vocabulary-lesson-intro">
            <div className="vocabulary-lesson-bubble" aria-live="polite">
              <p className="vocabulary-lesson-bubble-copy">
                You’re gonna learn
                <br />
                {cardsLoading ? (
                  '...'
                ) : (
                  <>
                    <span className="vocabulary-lesson-bubble-count">
                      {vocabularyItems.length}
                    </span>{' '}
                    new words today!
                  </>
                )}
              </p>
            </div>
            <img
              className="vocabulary-lesson-character"
              src={characterImage}
              alt=""
              aria-hidden="true"
            />
          </section>
        ) : view === 'flashcards' ? (
          <section className="vocabulary-lesson-flashcards">
            {/* 기존 flashcards UI 시작 */}
            <article className="vocabulary-lesson-flashcards-card">
              <p className="vocabulary-lesson-flashcards-label">Flashcards game</p>
              <h2 className="vocabulary-lesson-flashcards-word">{currentCard?.word ?? ''}</h2>
              <p className="vocabulary-lesson-flashcards-meaning" dir={translationDir}>
                {currentCard?.meaning ?? ''}
              </p>
            </article>
            <p className="vocabulary-lesson-flashcards-copy">
              Tap cards and quiz yourself with the words from this lesson.
            </p>
            <button
              type="button"
              className="vocabulary-lesson-flashcards-back-button"
              disabled={explanationOnly}
              onClick={handleBackPress}
            >
              BACK
            </button>
            {/* 기존 flashcards UI 끝 */}
          </section>
        ) : cardsLoading ? (
          <section className="vocabulary-lesson-study">
            <p className="vocabulary-lesson-loading">Loading cards...</p>
          </section>
        ) : (
          <section className="vocabulary-lesson-study">
            <div className="vocabulary-lesson-study-head">
              <button
                type="button"
                className="vocabulary-lesson-show-all-button"
                onClick={() => setView((current) => (current === 'card' ? 'table' : 'card'))}
              >
                {view === 'card' ? 'SHOW ALL CARDS' : 'TO CARDS VIEW'}
              </button>
            </div>

            {view === 'card' ? (
              <>
                <section
                  className="vocabulary-lesson-carousel"
                  aria-label="Vocabulary cards"
                  aria-roledescription="carousel"
                  aria-describedby="vocabulary-card-position"
                  tabIndex={0}
                  onKeyDown={handleCardKeyDown}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={() => {
                    pointerStartRef.current = null
                  }}
                >
                  <div
                    className="vocabulary-lesson-carousel-track"
                    style={{
                      transform: `translateX(-${(currentCardIndex + 1) * (cardWidth + cardGap)}px)`,
                    }}
                  >
                    {carouselEntries.map((entry) => {
                      if (entry.type === 'placeholder') {
                        return (
                          <div
                            key={entry.id}
                            className="vocabulary-lesson-card-shell vocabulary-lesson-card-shell-side"
                            aria-hidden="true"
                          />
                        )
                      }

                      const isCurrent = entry.index === currentCardIndex
                      const isFlipped = flippedWordIds.includes(entry.item.id)
                      const isSaved = personalListIds.includes(entry.item.id)
                      return (
                        <article
                          key={entry.id}
                          className={`vocabulary-lesson-card-shell ${
                            isCurrent
                              ? 'vocabulary-lesson-card-shell-current'
                              : 'vocabulary-lesson-card-shell-side'
                          }`}
                          onClick={isCurrent ? () => handleCurrentCardClick(entry.item.id) : undefined}
                        >
                          {isCurrent ? (
                            <>
                              <span className="vocabulary-lesson-main-card-count">
                                {entry.index + 1} /{vocabularyItems.length}
                              </span>
                              <span id="vocabulary-card-position" className="vocabulary-lesson-sr-only" aria-live="polite">
                                Card {entry.index + 1} of {vocabularyItems.length}
                              </span>

                              <div
                                className={`vocabulary-lesson-flip-card ${
                                  isFlipped ? 'vocabulary-lesson-flip-card-flipped' : ''
                                }`}
                              >
                                <div className="vocabulary-lesson-flip-card-inner">
                                  <div className="vocabulary-lesson-flip-face vocabulary-lesson-flip-face-front">
                                    <div className="vocabulary-lesson-main-card-center">
                                      <div className="vocabulary-lesson-main-card-word-row">
                                        <h2 className="vocabulary-lesson-main-card-word">
                                          {entry.item.word}
                                        </h2>
                                        <button
                                          type="button"
                                          className="vocabulary-lesson-speaker-button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            handleSpeakCurrentWord()
                                          }}
                                          aria-label={`Listen to ${entry.item.word} pronunciation`}
                                        >
                                          <svg
                                            className="vocabulary-lesson-speaker-icon"
                                            width="22"
                                            height="22"
                                            viewBox="0 0 22 22"
                                            fill="none"
                                            aria-hidden="true"
                                          >
                                            <path
                                              d="M5 9.25H7.55L10.45 6.75V15.25L7.55 12.75H5V9.25Z"
                                              stroke="currentColor"
                                              strokeWidth="1.7"
                                              strokeLinejoin="round"
                                            />
                                            <path
                                              d="M13.1 8.55C14.05 9.2 14.6 10.02 14.6 11C14.6 11.98 14.05 12.8 13.1 13.45"
                                              stroke="currentColor"
                                              strokeWidth="1.6"
                                              strokeLinecap="round"
                                            />
                                            <path
                                              d="M15.45 6.9C16.8 8 17.6 9.35 17.6 11C17.6 12.65 16.8 14 15.45 15.1"
                                              stroke="currentColor"
                                              strokeWidth="1.6"
                                              strokeLinecap="round"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="vocabulary-lesson-flip-face vocabulary-lesson-flip-face-back">
                                    <div className="vocabulary-lesson-main-card-center">
                                      <p
                                        className="vocabulary-lesson-main-card-back-copy"
                                        dir={translationDir}
                                      >
                                        {entry.item.meaning}
                                      </p>
                                      <p
                                        className="vocabulary-lesson-main-card-back-note"
                                        dir={translationDir}
                                      >
                                        {entry.item.note}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="vocabulary-lesson-main-card-note-button"
                                onPointerDown={(event) => {
                                  event.stopPropagation()
                                }}
                                onPointerUp={(event) => {
                                  event.stopPropagation()
                                }}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setPersonalListPrompt({ wordId: entry.item.id, source: 'card' })
                                }}
                                aria-label={
                                  isSaved
                                    ? `Remove ${entry.item.word} from personal list`
                                    : `Add ${entry.item.word} to personal list`
                                }
                                title={isSaved ? 'Remove from personal list' : 'Add to personal list'}
                              >
                                {renderPersonalListIcon(isSaved)}
                              </button>
                            </>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </section>

                <div className="vocabulary-lesson-card-controls">
                  <button
                    type="button"
                    className="vocabulary-lesson-card-control"
                    disabled={!hasPreviousCard}
                    onClick={() => moveCard('prev')}
                    aria-label="Previous vocabulary card"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="vocabulary-lesson-card-control"
                    disabled={!hasNextCard}
                    onClick={() => moveCard('next')}
                    aria-label="Next vocabulary card"
                  >
                    ›
                  </button>
                </div>

                <div className="vocabulary-lesson-indicators" role="list" aria-label="Vocabulary card progress">
                  {vocabularyItems.map((item, index) => (
                    <span
                      key={item.id}
                      role="listitem"
                      className={`vocabulary-lesson-indicator ${
                        index === currentCardIndex ? 'vocabulary-lesson-indicator-active' : ''
                      }`}
                      aria-label={`Card ${index + 1} of ${vocabularyItems.length}`}
                      aria-current={index === currentCardIndex ? 'step' : undefined}
                    />
                  ))}
                </div>
              </>
            ) : (
              <section className="vocabulary-lesson-table" aria-label="Vocabulary table view">
                <div className="vocabulary-lesson-table-header">
                  <div className="vocabulary-lesson-table-header-cell">
                    Korean Word
                  </div>
                  <div className="vocabulary-lesson-table-header-cell">
                    Translation
                  </div>
                </div>

                <div className="vocabulary-lesson-table-list">
                  {vocabularyItems.map((item) => {
                    const isSaved = personalListIds.includes(item.id)
                    const isExpanded = expandedTableWordIds.includes(item.id)

                    return (
                      <article
                        key={item.id}
                        className={`vocabulary-lesson-table-row ${
                          isExpanded ? 'vocabulary-lesson-table-row-expanded' : ''
                        }`}
                      >
                        <div
                          className="vocabulary-lesson-table-row-head"
                          onClick={() => toggleTableWord(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggleTableWord(item.id)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                        >
                          <button
                            type="button"
                            className={`vocabulary-lesson-table-add ${
                              isSaved ? 'vocabulary-lesson-table-add-active' : ''
                            }`}
                            onClick={(event) => {
                              event.stopPropagation()
                              setPersonalListPrompt({ wordId: item.id, source: 'table' })
                            }}
                            aria-label={
                              isSaved
                                ? `Remove ${item.word} from personal list`
                                : `Add ${item.word} to personal list`
                            }
                          >
                            {isSaved ? '−' : '+'}
                          </button>
                          <span className="vocabulary-lesson-table-word">
                            {item.word}
                          </span>
                          <span className="vocabulary-lesson-table-meaning" dir={translationDir}>
                            {item.meaning}
                          </span>
                          <svg
                            className={`vocabulary-lesson-table-arrow ${
                              isExpanded ? 'vocabulary-lesson-table-arrow-open' : ''
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
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        {isExpanded ? (
                          <div className="vocabulary-lesson-table-notes">
                            <p className="vocabulary-lesson-table-note-line">
                              <span className="vocabulary-lesson-table-note-label">Notes</span>
                              <span dir={translationDir}>{item.note || item.meaning}</span>
                            </p>
                            <p className="vocabulary-lesson-table-example">
                              한국어 예문
                              <span className="vocabulary-lesson-table-example-icon">文</span>
                            </p>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              </section>
            )}

            {view === 'card' ? (
              <button
                type="button"
                className="vocabulary-lesson-flashcard-button"
                onClick={onOpenFlashcardPractice}
              >
                to flashcard practice
              </button>
            ) : null}

            <div className="vocabulary-lesson-next-wrap">
              <button
                type="button"
                className="vocabulary-lesson-next-button"
                disabled={saveProgress.isPending || explanationOnly}
                onClick={() => void handleOpenNextGrammar()}
              >
                NEXT
              </button>
            </div>
          </section>
        )}
      </section>

      {view === 'intro' ? (
        <div className="vocabulary-lesson-start-wrap">
          <button
            type="button"
            className="vocabulary-lesson-start-button"
            onClick={() => setView('card')}
          >
            START
          </button>
        </div>
      ) : null}

      {promptWord ? (
        <div
          className="vocabulary-lesson-modal-backdrop"
          role="presentation"
          onClick={() => setPersonalListPrompt(null)}
        >
          <section
            className="vocabulary-lesson-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              promptWordSaved
                ? 'Confirm removal from personal list'
                : 'Confirm addition to personal list'
            }
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setPersonalListPrompt(null)
            }}
          >
            <p className="vocabulary-lesson-modal-copy">
              {promptCopy}
            </p>
            <div className="vocabulary-lesson-modal-actions">
              <button
                ref={promptCancelButtonRef}
                type="button"
                className="vocabulary-lesson-modal-button vocabulary-lesson-modal-button-secondary"
                onClick={() => setPersonalListPrompt(null)}
              >
                NO
              </button>
              <button
                type="button"
                className="vocabulary-lesson-modal-button vocabulary-lesson-modal-button-primary"
                disabled={isPromptWordPending}
                onClick={() => {
                  if (isPromptWordPending) return
                  void handleTogglePersonalList(promptWord.id)
                  setPersonalListPrompt(null)
                }}
              >
                YES
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default VocabularyLessonPage
