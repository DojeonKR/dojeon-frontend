import { useEffect, useState } from 'react'
import './VocabularyPage.css'
import { useVocabScraps } from '../hooks/useVocabScraps.ts'
import type { VocabScrapGroup, VocabScrapItem } from '../types/scraps.types.ts'
import {
  contentTextDirection,
  pickLocaleText,
  toContentLanguage,
  type ContentLanguage,
} from '../data/contentLanguage.ts'

interface VocabularyPageProps {
  language: string
  onBack: () => void
}

// 대시보드 preview(백엔드에서 5개로 잘라 보냄)와 개수를 맞춰 notebook → see more 이동 시 목록이 줄어 보이지 않게 한다.
const COURSE_PREVIEW_WORD_COUNT = 5

const getWordFront = (item: VocabScrapItem) => item.card?.wordFront ?? 'Unknown word'

const getTranslation = (item: VocabScrapItem, language: ContentLanguage) =>
  pickLocaleText(item.card?.locales, language, 'back') ??
  item.card?.wordBack ??
  'No translation yet.'

const getNotes = (item: VocabScrapItem, language: ContentLanguage) =>
  pickLocaleText(item.card?.locales, language, 'notes') ?? item.card?.notes ?? 'No notes yet.'

const getExample = (item: VocabScrapItem) => {
  const word = item.card?.wordFront ?? ''
  return word ? `한국어 예문 ${word}` : '한국어 예문'
}

const extractLessonNumber = (item: VocabScrapItem) => {
  if (typeof item.lessonId === 'number') return item.lessonId

  const match = item.lessonTitle?.match(/\d+/)
  return match ? Number(match[0]) : null
}

const formatLessonNumbers = (lessonNumbers: number[]) => {
  const numbers = [...new Set(lessonNumbers)].sort((a, b) => a - b)
  if (numbers.length === 0) return 'Lesson 1'
  if (numbers.length === 1) return `Lesson ${numbers[0]}`

  const first = numbers[0]
  const last = numbers[numbers.length - 1]
  const hasNumberBetween = last - first >= 2

  return `Lesson ${hasNumberBetween ? `${first}-${last}` : numbers.join(',')}`
}

const getLessonTag = (group: VocabScrapGroup) => {
  const lessonNumbers = group.items
    .map(extractLessonNumber)
    .filter((lessonNumber): lessonNumber is number => lessonNumber !== null)

  return formatLessonNumbers(lessonNumbers)
}

const previewVocabGroups: VocabScrapGroup[] = [
  {
    courseId: 1,
    courseTitle: 'Course 1',
    items: [
      {
        scrapId: 'preview-vocab-1',
        cardId: 1,
        lessonId: 1,
        lessonTitle: 'lesson 1',
        createdAt: '2026-06-08T00:00:00.000Z',
        card: {
          id: 1,
          wordFront: '나무',
          wordBack: 'Tree',
          notes: '나무를 뜻하는 말',
          locales: {
            he: {
              back: 'אני',
              notes: 'צורת "אני" מנומסת',
            },
          },
          audioUrl: null,
          sequence: 1,
        },
      },
      {
        scrapId: 'preview-vocab-2',
        cardId: 2,
        lessonId: 2,
        lessonTitle: 'lesson 2',
        createdAt: '2026-06-08T00:00:00.000Z',
        card: {
          id: 2,
          wordFront: '생신',
          wordBack: 'Birthday',
          notes: '생일의 높임말',
          locales: null,
          audioUrl: null,
          sequence: 2,
        },
      },
      {
        scrapId: 'preview-vocab-3',
        cardId: 3,
        lessonId: 3,
        lessonTitle: 'lesson 3',
        createdAt: '2026-06-08T00:00:00.000Z',
        card: {
          id: 3,
          wordFront: '꽃',
          wordBack: 'Flower',
          notes: 'Plant blossom.',
          locales: null,
          audioUrl: null,
          sequence: 3,
        },
      },
    ],
  },
  {
    courseId: 2,
    courseTitle: 'Course 2',
    items: [
      {
        scrapId: 'preview-vocab-4',
        cardId: 4,
        lessonId: 1,
        lessonTitle: 'lesson 1',
        createdAt: '2026-06-08T00:00:00.000Z',
        card: {
          id: 4,
          wordFront: '먹다',
          wordBack: 'To eat',
          notes: 'Dictionary form of the verb.',
          locales: null,
          audioUrl: null,
          sequence: 1,
        },
      },
      {
        scrapId: 'preview-vocab-5',
        cardId: 5,
        lessonId: 3,
        lessonTitle: 'lesson 3',
        createdAt: '2026-06-08T00:00:00.000Z',
        card: {
          id: 5,
          wordFront: '가다',
          wordBack: 'To go',
          notes: 'Dictionary form of the verb.',
          locales: null,
          audioUrl: null,
          sequence: 2,
        },
      },
    ],
  },
]

function VocabularyPage({ language, onBack }: VocabularyPageProps) {
  const contentLanguage = toContentLanguage(language)
  const translationDir = contentTextDirection(contentLanguage)
  const [isRecentSort, setIsRecentSort] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [expandedScrapId, setExpandedScrapId] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<VocabScrapItem | null>(null)
  const [flashcardScrapIds, setFlashcardScrapIds] = useState<Set<string>>(() => new Set())
  const { groups, loading, loadingMore, hasMore, error, fetchNextPage, refetch } = useVocabScraps()
  const visibleGroups = import.meta.env.DEV && groups.length === 0 ? previewVocabGroups : groups
  // 코스별 그룹은 모든 페이지가 도착해야 완성되므로 남은 페이지를 이어서 받아온다.
  useEffect(() => {
    if (!hasMore || loadingMore) return
    fetchNextPage()
  }, [hasMore, loadingMore, fetchNextPage])

  // 그룹 객체를 저장하지 않고 courseId로 다시 찾는다. 뒤이어 도착한 페이지의 단어까지 반영되도록.
  const selectedGroup =
    visibleGroups.find((group) => group.courseId === selectedCourseId) ?? null
  const selectedFlashcardItems = selectedGroup
    ? selectedGroup.items.filter((item) => flashcardScrapIds.has(item.scrapId))
    : []
  const selectedWordFlashcardIndex = selectedWord
    ? selectedFlashcardItems.findIndex((item) => item.scrapId === selectedWord.scrapId)
    : -1
  const selectedWordGroupIndex =
    selectedWord && selectedGroup
      ? selectedGroup.items.findIndex((item) => item.scrapId === selectedWord.scrapId)
      : -1
  const selectedWordDisplayIndex =
    selectedWordFlashcardIndex >= 0
      ? selectedWordFlashcardIndex + 1
      : selectedWordGroupIndex >= 0
        ? selectedWordGroupIndex + 1
        : (selectedWord?.card?.sequence ?? 1)

  const toggleFlashcardItem = (scrapId: string) => {
    setFlashcardScrapIds((current) => {
      const next = new Set(current)
      if (next.has(scrapId)) next.delete(scrapId)
      else next.add(scrapId)
      return next
    })
  }

  const removeFlashcardItem = (scrapId: string) => {
    setFlashcardScrapIds((current) => {
      const next = new Set(current)
      next.delete(scrapId)
      return next
    })

    const nextSelected = selectedFlashcardItems.find((item) => item.scrapId !== scrapId)
    setSelectedWord(nextSelected ?? null)
  }

  const handleBack = () => {
    if (selectedWord) {
      setSelectedWord(null)
      return
    }

    if (selectedGroup) {
      setSelectedCourseId(null)
      setExpandedScrapId(null)
      return
    }

    onBack()
  }

  const title = selectedWord ? 'Vocabulary' : 'Vocabulary'

  return (
    <main className="vocabulary-screen">
      <section className="vocabulary-content">
        <header className="vocabulary-header">
          <button
            type="button"
            className="vocabulary-back"
            onClick={handleBack}
            aria-label="Go back"
          >
            <svg
              className="vocabulary-back-icon"
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
          <h1 className="vocabulary-title">{title}</h1>
        </header>

        {!selectedWord ? (
          <div className="vocabulary-sort-row">
            <button
              type="button"
              className="vocabulary-sort-button"
              onClick={() => setIsRecentSort((prev) => !prev)}
            >
              <span>Recently viewed</span>
              <svg
                className={`vocabulary-sort-icon ${isRecentSort ? 'is-recent' : 'is-alt'}`}
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
        ) : null}

        {selectedWord ? (
          <WordDetail
            item={selectedWord}
            index={selectedWordDisplayIndex}
            contentLanguage={contentLanguage}
            translationDir={translationDir}
            onRemove={() => removeFlashcardItem(selectedWord.scrapId)}
          />
        ) : selectedGroup ? (
          <WordList
            group={selectedGroup}
            contentLanguage={contentLanguage}
            translationDir={translationDir}
            expandedScrapId={expandedScrapId}
            flashcardScrapIds={flashcardScrapIds}
            onToggle={(scrapId) => {
              setExpandedScrapId((current) => (current === scrapId ? null : scrapId))
            }}
            onToggleFlashcard={toggleFlashcardItem}
            onOpenDetail={setSelectedWord}
            onOpenFlashcardPractice={() => {
              const [firstSelectedItem] = selectedFlashcardItems
              if (firstSelectedItem) setSelectedWord(firstSelectedItem)
            }}
          />
        ) : loading ? (
          <p className="vocabulary-loading">Loading...</p>
        ) : error && visibleGroups.length === 0 ? (
          <div className="notebook-empty-state">
            <p>Vocabulary sync unavailable.</p>
            <button type="button" onClick={() => void refetch()}>
              Retry sync
            </button>
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="notebook-empty-state">
            <p>No vocabulary scraps yet.</p>
            {error ? (
              <button type="button" onClick={() => void refetch()}>
                Retry sync
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <CourseList
              groups={visibleGroups}
              onOpenGroup={(group) => setSelectedCourseId(group.courseId)}
            />
            {loadingMore ? <p className="vocabulary-loading">Loading more...</p> : null}
          </>
        )}
      </section>
    </main>
  )
}

function CourseList({
  groups,
  onOpenGroup,
}: {
  groups: VocabScrapGroup[]
  onOpenGroup: (group: VocabScrapGroup) => void
}) {
  return (
    <section className="vocabulary-card-list">
      {groups.map((group) => (
        <article key={group.courseId} className="vocabulary-card">
          <div className="vocabulary-card-head">
            <p className="vocabulary-card-title">{group.courseTitle}</p>
            <span className="vocabulary-lesson-tag">{getLessonTag(group)}</span>
          </div>
          <div className="vocabulary-card-items">
            {group.items.slice(0, COURSE_PREVIEW_WORD_COUNT).map((item, index) => (
              <p key={item.scrapId}>
                {index + 1}. {getWordFront(item)}
              </p>
            ))}
          </div>
          <button
            type="button"
            className="vocabulary-card-link"
            onClick={() => onOpenGroup(group)}
          >
            see more
          </button>
        </article>
      ))}
    </section>
  )
}

function WordList({
  group,
  contentLanguage,
  translationDir,
  expandedScrapId,
  flashcardScrapIds,
  onToggle,
  onToggleFlashcard,
  onOpenDetail,
  onOpenFlashcardPractice,
}: {
  group: VocabScrapGroup
  contentLanguage: ContentLanguage
  translationDir: 'rtl' | 'ltr'
  expandedScrapId: string | null
  flashcardScrapIds: Set<string>
  onToggle: (scrapId: string) => void
  onToggleFlashcard: (scrapId: string) => void
  onOpenDetail: (item: VocabScrapItem) => void
  onOpenFlashcardPractice: () => void
}) {
  const hasFlashcardItems = group.items.some((item) => flashcardScrapIds.has(item.scrapId))

  return (
    <>
      <section className="vocabulary-word-list">
        <div className="vocabulary-word-list-head">
          <span className="vocabulary-lesson-tag">{getLessonTag(group)}</span>
        </div>

        <div className="vocabulary-table" role="table" aria-label="Vocabulary words">
          <div className="vocabulary-table-row vocabulary-table-header" role="row">
            <span role="columnheader" />
            <span role="columnheader">Korean Word</span>
            <span role="columnheader">Translation</span>
            <span role="columnheader" />
          </div>

          {group.items.map((item) => {
            const isExpanded = expandedScrapId === item.scrapId
            const isInFlashcard = flashcardScrapIds.has(item.scrapId)

            return (
              <div key={item.scrapId} className="vocabulary-word-entry">
                <div
                  className={`vocabulary-table-row vocabulary-word-row ${
                    isExpanded ? 'is-expanded' : ''
                  }`}
                  role="row"
                >
                  <button
                    type="button"
                    className="vocabulary-row-icon"
                    onClick={() => onToggleFlashcard(item.scrapId)}
                    aria-label={isInFlashcard ? 'Remove from flashcard practice' : 'Add to flashcard practice'}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d={isInFlashcard ? 'M2.5 7H11.5' : 'M7 2.5V11.5M2.5 7H11.5'}
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <span>{getWordFront(item)}</span>
                  <span dir={translationDir}>{getTranslation(item, contentLanguage)}</span>
                  <button
                    type="button"
                    className="vocabulary-row-chevron"
                    onClick={() => onToggle(item.scrapId)}
                    aria-label={isExpanded ? 'Collapse notes' : 'Expand notes'}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d={isExpanded ? 'M7 14L12 9L17 14' : 'M7 10L12 15L17 10'}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                {isExpanded ? (
                  <div className="vocabulary-notes-panel">
                    <div className="vocabulary-note-line">
                      <span className="vocabulary-note-tag">Notes</span>
                      <span dir={translationDir}>{getNotes(item, contentLanguage)}</span>
                    </div>
                    <div className="vocabulary-example-line">
                      <span>{getExample(item)}</span>
                      <TranslateIcon />
                    </div>
                    <button
                      type="button"
                      className="vocabulary-detail-link"
                      onClick={() => onOpenDetail(item)}
                    >
                      see more
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <div className="vocabulary-practice-bar">
        <button
          type="button"
          className="vocabulary-practice-button"
          onClick={onOpenFlashcardPractice}
          disabled={!hasFlashcardItems}
        >
          to flashcard practice
        </button>
      </div>
    </>
  )
}

function WordDetail({
  item,
  index,
  contentLanguage,
  translationDir,
  onRemove,
}: {
  item: VocabScrapItem
  index: number
  contentLanguage: ContentLanguage
  translationDir: 'rtl' | 'ltr'
  onRemove: () => void
}) {
  const word = getWordFront(item)
  const translation = getTranslation(item, contentLanguage)
  const notes = getNotes(item, contentLanguage)
  const example = getExample(item)

  return (
    <section className="vocabulary-detail">
      <article className="vocabulary-detail-hero">
        <div className="vocabulary-detail-word-row">
          <h2>{word}</h2>
          <button
            type="button"
            className="vocabulary-row-icon vocabulary-detail-minus"
            onClick={onRemove}
            aria-label="Remove from flashcard practice"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2.5 7H11.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <p className="vocabulary-detail-translation" dir={translationDir}>
          {index}. {translation}
        </p>
        <div className="vocabulary-detail-pronunciation">
          <span>Pronunciation</span>
          <button type="button" className="vocabulary-audio-button" aria-label="Play pronunciation">
            <SpeakerIcon />
          </button>
        </div>
      </article>

      <article className="vocabulary-detail-notes">
        <p className="vocabulary-detail-numbered" dir={translationDir}>
          {index}. {translation}
        </p>
        <div className="vocabulary-note-line">
          <span className="vocabulary-note-tag">Notes</span>
          <span dir={translationDir}>{notes}</span>
        </div>
        <div className="vocabulary-example-stack">
          <div className="vocabulary-example-line">
            <span>{example}</span>
            <TranslateIcon />
          </div>
          <div className="vocabulary-example-line">
            <span>한국어</span>
            <TranslateIcon />
          </div>
        </div>
      </article>
    </section>
  )
}

function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 5.25H5.1L8 3V11L5.1 8.75H3V5.25Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 5.2C10.45 5.65 10.7 6.25 10.7 7C10.7 7.75 10.45 8.35 10 8.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TranslateIcon() {
  return (
    <span className="vocabulary-translate-icon" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.25 3.25H7.25M4.75 2.25V3.25M5 3.25C4.7 4.45 3.95 5.45 2.75 6.25M4.1 5.1C4.55 5.65 5.1 6.05 5.75 6.3M6.25 9.75L8.25 5.25L10.25 9.75M6.85 8.45H9.65"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export default VocabularyPage
