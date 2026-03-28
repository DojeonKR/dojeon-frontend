import './PracticePage.css'

interface PracticePageProps {
  onBack: () => void
}

function PracticePage({ onBack }: PracticePageProps) {
  return (
    <main className="practice-screen">
      <section className="practice-screen-content">
        <header className="practice-screen-header">
          <button
            type="button"
            className="practice-screen-back"
            onClick={onBack}
            aria-label="뒤로 가기"
          >
            <svg
              className="practice-screen-back-icon"
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
        </header>
        <h1 className="practice-screen-title">(practice zone)</h1>
        <p className="practice-screen-coming-soon">Comming Soon</p>
      </section>
    </main>
  )
}

export default PracticePage
