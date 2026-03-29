import { useState } from 'react'
import './GrammarNotebookPage.css'
import rightArrowIcon from '../assets/icon-park-outline_right-c.png'

interface GrammarNotebookPageProps {
  onBack: () => void
}

function GrammarNotebookPage({ onBack }: GrammarNotebookPageProps) {
  const [isRecentSort, setIsRecentSort] = useState(true)

  return (
    <main className="grammar-notebook-screen">
      <section className="grammar-notebook-content">
        <header className="grammar-notebook-header">
          <button
            type="button"
            className="grammar-notebook-back"
            onClick={onBack}
            aria-label="뒤로 가기"
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
          <h1 className="grammar-notebook-title">Grammar</h1>
        </header>

        <div className="grammar-notebook-sort-row">
          <button
            type="button"
            className="grammar-notebook-sort-button"
            onClick={() => setIsRecentSort((prev) => !prev)}
          >
            <span>Recently viewed</span>
            <svg
              className={`grammar-notebook-sort-icon ${isRecentSort ? 'is-recent' : 'is-alt'}`}
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

        <section className="grammar-notebook-card-list">
          {['lesson 5', 'lesson 4', 'lesson 3', 'lesson 2', 'lesson 1'].map((lesson) => (
            <article key={lesson} className="grammar-notebook-card">
              <div className="grammar-notebook-card-top">
                <p className="grammar-notebook-course">COURSE 1</p>
                <span className="grammar-notebook-badge">{lesson}</span>
              </div>
              <div className="grammar-notebook-card-bottom">
                <p className="grammar-notebook-topic">을까요?</p>
              </div>
              <img
                src={rightArrowIcon}
                alt=""
                aria-hidden="true"
                className="grammar-notebook-arrow"
              />
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}

export default GrammarNotebookPage
