import { Fragment, useRef, useState } from 'react'
import homeIcon from '../assets/home.png'
import editIcon from '../assets/edit.png'
import fileIcon from '../assets/file.png'
import bookOpenIcon from '../assets/book-open.png'
import profileIcon from '../assets/user.png'
import characterImage from '../assets/character.png'
import noteAddIcon from '../assets/hugeicons_note-add.png'
import './VocabularyLessonPage.css'

interface VocabularyLessonPageProps {
  onBack: () => void
  onOpenHome: () => void
  onOpenClass: () => void
  onOpenPractice: () => void
  onOpenNotebook: () => void
  onOpenProfile: () => void
  onOpenNextGrammar: () => void
}

type VocabularyLessonView = 'intro' | 'card' | 'table' | 'flashcards'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: editIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

const vocabularyItems = [
  {
    id: 1,
    word: '생신',
    pronunciation: 'saeng-sin',
    meaning: 'Birthday',
    note: '생일 (높임말)',
  },
  {
    id: 2,
    word: '꽃',
    pronunciation: 'kkot',
    meaning: 'Flower',
    note: '식물의 꽃',
  },
  {
    id: 3,
    word: '나무',
    pronunciation: 'na-mu',
    meaning: 'Tree',
    note: '줄기와 가지가 있는 식물',
  },
]

const swipeThreshold = 40
const cardWidth = 236
const cardGap = 13

function VocabularyLessonPage({
  onBack,
  onOpenHome,
  onOpenClass,
  onOpenPractice,
  onOpenNotebook,
  onOpenProfile,
  onOpenNextGrammar,
}: VocabularyLessonPageProps) {
  const [view, setView] = useState<VocabularyLessonView>('intro')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [flippedWordIds, setFlippedWordIds] = useState<number[]>([])
  const [personalListIds, setPersonalListIds] = useState<number[]>([])
  const [personalListPromptWordId, setPersonalListPromptWordId] = useState<number | null>(null)
  const pointerStartXRef = useRef<number | null>(null)

  const currentCard = vocabularyItems[currentCardIndex]
  const carouselEntries = [
    { id: 'placeholder-start', type: 'placeholder' as const },
    ...vocabularyItems.map((item, index) => ({ id: item.id, type: 'word' as const, item, index })),
    { id: 'placeholder-end', type: 'placeholder' as const },
  ]

  const handleSpeakCurrentWord = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const utterance = new SpeechSynthesisUtterance(currentCard.word)
    utterance.lang = 'ko-KR'
    utterance.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

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

  const togglePersonalList = (wordId: number) => {
    setPersonalListIds((current) =>
      current.includes(wordId) ? current.filter((id) => id !== wordId) : [...current, wordId],
    )
  }

  const moveCard = (direction: 'prev' | 'next') => {
    setCurrentCardIndex((current) => {
      if (direction === 'prev') {
        return Math.max(current - 1, 0)
      }

      return Math.min(current + 1, vocabularyItems.length - 1)
    })
  }

  const handlePointerDown = (clientX: number) => {
    pointerStartXRef.current = clientX
  }

  const handlePointerUp = (clientX: number) => {
    if (pointerStartXRef.current === null) {
      return
    }

    const deltaX = clientX - pointerStartXRef.current
    pointerStartXRef.current = null

    if (deltaX <= -swipeThreshold) {
      moveCard('next')
    }

    if (deltaX >= swipeThreshold) {
      moveCard('prev')
    }
  }

  const title =
    view === 'intro'
      ? 'Vocabulary lesson'
      : view === 'flashcards'
        ? 'Flashcards game'
        : "This lesson's words"

  const promptWord =
    personalListPromptWordId === null
      ? null
      : vocabularyItems.find((item) => item.id === personalListPromptWordId) ?? null
  const promptWordSaved = promptWord ? personalListIds.includes(promptWord.id) : false

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
      <img
        className="vocabulary-lesson-main-card-note-icon"
        src={noteAddIcon}
        alt=""
        aria-hidden="true"
      />
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
            onClick={handleBackPress}
            aria-label="뒤로 가기"
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
                You&apos;re gonna learn
                <br />
                {vocabularyItems.length} new words today!
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
            <article className="vocabulary-lesson-flashcards-card">
              <p className="vocabulary-lesson-flashcards-label">Flashcards game</p>
              <h2 className="vocabulary-lesson-flashcards-word">{currentCard.word}</h2>
              <p className="vocabulary-lesson-flashcards-meaning">{currentCard.meaning}</p>
            </article>
            <p className="vocabulary-lesson-flashcards-copy">
              Tap cards and quiz yourself with the words from this lesson.
            </p>
          </section>
        ) : (
          <section className="vocabulary-lesson-study">
            <div className="vocabulary-lesson-study-head">
              <button
                type="button"
                className="vocabulary-lesson-show-all-button"
                onClick={() => setView((current) => (current === 'card' ? 'table' : 'card'))}
              >
                {view === 'card' ? 'SHOW ALL CARDS' : 'TO CARD VIEW'}
              </button>
            </div>

            {view === 'card' ? (
              <>
                <section
                  className="vocabulary-lesson-carousel"
                  aria-label="Vocabulary cards"
                  onPointerDown={(event) => handlePointerDown(event.clientX)}
                  onPointerUp={(event) => handlePointerUp(event.clientX)}
                  onPointerCancel={() => {
                    pointerStartXRef.current = null
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
                          onClick={isCurrent ? () => toggleFlip(entry.item.id) : undefined}
                        >
                          {isCurrent ? (
                            <>
                              <span className="vocabulary-lesson-main-card-count">
                                {entry.index + 1}/{vocabularyItems.length}
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
                                          aria-label={`${entry.item.word} 발음 듣기`}
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
                                      <p className="vocabulary-lesson-main-card-back-copy">
                                        {entry.item.meaning}
                                      </p>
                                      <p className="vocabulary-lesson-main-card-back-note">
                                        {entry.item.note}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {isFlipped ? (
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
                                    setPersonalListPromptWordId(entry.item.id)
                                  }}
                                  aria-label={
                                    isSaved
                                      ? `${entry.item.word} personal list에서 제거`
                                      : `${entry.item.word} personal list에 추가`
                                  }
                                >
                                  {renderPersonalListIcon(isSaved)}
                                </button>
                              ) : null}
                            </>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </section>

                <div className="vocabulary-lesson-indicators" aria-hidden="true">
                  {vocabularyItems.map((item, index) => (
                    <span
                      key={item.id}
                      className={`vocabulary-lesson-indicator ${
                        index === currentCardIndex ? 'vocabulary-lesson-indicator-active' : ''
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <section className="vocabulary-lesson-table" aria-label="Vocabulary table view">
                <div className="vocabulary-lesson-table-grid">
                  <div className="vocabulary-lesson-table-cell vocabulary-lesson-table-cell-header">
                    Korean Word
                  </div>
                  <div className="vocabulary-lesson-table-cell vocabulary-lesson-table-cell-header">
                    Translation
                  </div>
                  <div className="vocabulary-lesson-table-cell vocabulary-lesson-table-cell-header">
                    Notes
                  </div>
                  <div className="vocabulary-lesson-table-cell vocabulary-lesson-table-cell-header" />

                  {vocabularyItems.map((item) => {
                    const isSaved = personalListIds.includes(item.id)

                    return (
                      <Fragment key={item.id}>
                        <div className="vocabulary-lesson-table-cell vocabulary-lesson-table-cell-body">
                          {item.word}
                        </div>
                        <div className="vocabulary-lesson-table-cell vocabulary-lesson-table-cell-body">
                          {item.meaning}
                        </div>
                        <div className="vocabulary-lesson-table-cell vocabulary-lesson-table-cell-body">
                          {item.note}
                        </div>
                        <button
                          type="button"
                          className="vocabulary-lesson-table-cell vocabulary-lesson-table-action"
                          onClick={() => setPersonalListPromptWordId(item.id)}
                          aria-label={
                            isSaved
                              ? `${item.word} personal list에서 제거`
                              : `${item.word} personal list에 추가`
                          }
                        >
                          {renderPersonalListIcon(isSaved)}
                        </button>
                      </Fragment>
                    )
                  })}
                </div>
              </section>
            )}

            {view === 'card' ? (
              <button
                type="button"
                className="vocabulary-lesson-flashcard-button"
                onClick={() => setView('flashcards')}
              >
                to flashcard practice
              </button>
            ) : null}

            <div className="vocabulary-lesson-next-wrap">
              <button
                type="button"
                className="vocabulary-lesson-next-button"
                onClick={onOpenNextGrammar}
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

      {view === 'intro' ? (
        <nav className="vocabulary-lesson-bottom-nav">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`vocabulary-lesson-tab ${
                tab.label === 'CLASS' ? 'vocabulary-lesson-tab-active' : ''
              }`}
              onClick={() => {
                if (tab.label === 'HOME') {
                  onOpenHome()
                }

                if (tab.label === 'CLASS') {
                  onOpenClass()
                }

                if (tab.label === 'PRACTICE') {
                  onOpenPractice()
                }

                if (tab.label === 'NOTEBOOK') {
                  onOpenNotebook()
                }

                if (tab.label === 'PROFILE') {
                  onOpenProfile()
                }
              }}
            >
              <img className="vocabulary-lesson-tab-icon" src={tab.icon} alt="" aria-hidden="true" />
              <span className="vocabulary-lesson-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      ) : null}

      {promptWord ? (
        <div className="vocabulary-lesson-modal-backdrop" role="presentation">
          <section
            className="vocabulary-lesson-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              promptWordSaved
                ? 'Remove from personal list 확인'
                : 'Add to personal list 확인'
            }
          >
            <p className="vocabulary-lesson-modal-copy">
              {promptWordSaved ? 'Do you want to remove it' : 'Do you want to add it'}
              <br />
              {promptWordSaved ? 'from your personal list?' : 'to your personal list?'}
            </p>
            <div className="vocabulary-lesson-modal-actions">
              <button
                type="button"
                className="vocabulary-lesson-modal-button vocabulary-lesson-modal-button-secondary"
                onClick={() => setPersonalListPromptWordId(null)}
              >
                NO
              </button>
              <button
                type="button"
                className="vocabulary-lesson-modal-button vocabulary-lesson-modal-button-primary"
                onClick={() => {
                  togglePersonalList(promptWord.id)
                  setPersonalListPromptWordId(null)
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
