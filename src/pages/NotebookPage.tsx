import './NotebookPage.css'
import homeIcon from '../assets/home.svg'
import classIcon from '../assets/Class.svg'
import fileIcon from '../assets/file.svg'
import bookOpenIcon from '../assets/book-open.svg'
import profileIcon from '../assets/user.svg'
import { useScrapDashboard } from '../hooks/useScrapDashboard.ts'
import type { GrammarPreviewItem, VocabularyPreviewGroup } from '../types/scraps.types.ts'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: classIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

const previewVocabularyGroups: VocabularyPreviewGroup[] = [
  {
    courseId: 1,
    courseTitle: 'Course 1',
    words: ['저', '이름', '한국어', '감사'],
  },
  {
    courseId: 2,
    courseTitle: 'Course 2',
    words: ['먹다', '가다', '보다'],
  },
]

const previewGrammarItems: GrammarPreviewItem[] = [
  {
    scrapId: 'preview-grammar-1',
    courseTitle: 'Course 1',
    lessonTitle: 'lesson 5',
    grammarPoint: '-을까요?',
  },
  {
    scrapId: 'preview-grammar-2',
    courseTitle: 'Course 1',
    lessonTitle: 'lesson 6',
    grammarPoint: '-고 싶어요',
  },
]

interface NotebookPageProps {
  userName?: string
  onOpenGrammarNotebook: () => void
  onOpenVocabulary: () => void
  onOpenHome: () => void
  onOpenClass: () => void
  onOpenPractice: () => void
  onOpenProfile: () => void
}

function NotebookPage({
  userName,
  onOpenGrammarNotebook,
  onOpenVocabulary,
  onOpenHome,
  onOpenClass,
  onOpenPractice,
  onOpenProfile,
}: NotebookPageProps) {
  const { data, loading } = useScrapDashboard()

  const displayName = data?.userName ?? userName ?? 'USER'
  const apiVocabGroups = data?.vocabularyPreview.groups ?? []
  const apiGrammarItems = data?.grammarPreview ?? []
  const shouldUsePreviewData = import.meta.env.DEV && apiVocabGroups.length === 0 && apiGrammarItems.length === 0
  const vocabGroups = shouldUsePreviewData ? previewVocabularyGroups : apiVocabGroups
  const grammarItems = shouldUsePreviewData ? previewGrammarItems : apiGrammarItems

  return (
    <main className="notebook-screen">
      <section className="notebook-content">
        <h1 className="notebook-title">{`${displayName}’s personal notebook`}</h1>

        <section className="notebook-section">
          <div className="notebook-section-header">
            <h2 className="notebook-section-title">Vocabulary</h2>
            <button
              type="button"
              className="notebook-section-link"
              onClick={onOpenVocabulary}
            >
              see more
            </button>
          </div>

          {loading && vocabGroups.length === 0 ? (
            <p className="notebook-loading">Loading...</p>
          ) : (
            <div className="notebook-card-row">
              {vocabGroups.map((group) => (
                <article key={group.courseId} className="notebook-card">
                  <p className="notebook-card-title">{group.courseTitle}</p>
                  <div className="notebook-card-list">
                    {group.words.map((word, i) => (
                      <p key={i}>{i + 1}. {word}</p>
                    ))}
                  </div>
                  <button type="button" className="notebook-card-link" onClick={onOpenVocabulary}>
                    see more
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="notebook-section notebook-section-grammar">
          <div className="notebook-section-header">
            <h2 className="notebook-section-title">Grammar</h2>
            <button
              type="button"
              className="notebook-section-link"
              onClick={onOpenGrammarNotebook}
            >
              see more
            </button>
          </div>

          {loading && grammarItems.length === 0 ? (
            <p className="notebook-loading">Loading...</p>
          ) : (
            <div className="notebook-grammar-list">
              {grammarItems.map((item) => (
                <button
                  key={item.scrapId}
                  type="button"
                  className="notebook-grammar-card"
                  onClick={onOpenGrammarNotebook}
                >
                  <div className="notebook-grammar-top">
                    <p className="notebook-grammar-course">{item.courseTitle}</p>
                    <span className="notebook-grammar-badge">{item.lessonTitle}</span>
                  </div>
                  <div className="notebook-grammar-bottom">
                    <p className="notebook-grammar-topic">{item.grammarPoint}</p>
                  </div>
                  <svg
                    className="notebook-grammar-arrow"
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
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      <nav className="notebook-bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`notebook-tab ${tab.label === 'NOTEBOOK' ? 'notebook-tab-active' : ''}`}
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

              if (tab.label === 'PROFILE') {
                onOpenProfile()
              }
            }}
          >
            <img className="notebook-tab-icon" src={tab.icon} alt="" aria-hidden="true" />
            <span className="notebook-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export default NotebookPage
