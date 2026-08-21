import './PracticePage.css'
import homeIcon from '../assets/home.svg'
import classIcon from '../assets/Class.svg'
import fileIcon from '../assets/file.svg'
import bookOpenIcon from '../assets/book-open.svg'
import profileIcon from '../assets/user.svg'
import characterImage from '../assets/2.png'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: classIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

interface PracticePageProps {
  onBack: () => void
  onOpenHome: () => void
  onOpenClass: () => void
  onOpenNotebook: () => void
  onOpenProfile: () => void
}

function PracticePage({
  onBack,
  onOpenHome,
  onOpenClass,
  onOpenNotebook,
  onOpenProfile,
}: PracticePageProps) {
  return (
    <main className="practice-screen">
      <section className="practice-screen-content">
        <header className="practice-screen-header">
          <button
            type="button"
            className="practice-screen-back"
            onClick={onBack}
            aria-label="Go back"
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
          <h1 className="practice-screen-title">Practice Zone</h1>
        </header>

        <section className="practice-coming-soon-panel" aria-label="Practice coming soon">
          <p className="practice-screen-coming-soon">Coming Soon</p>
          <img
            className="practice-screen-character"
            src={characterImage}
            alt=""
            aria-hidden="true"
          />
        </section>
      </section>

      <nav className="practice-bottom-nav">
        {tabs.map((tab) => (
          <button
            type="button"
            className={`practice-tab ${tab.label === 'PRACTICE' ? 'practice-tab-active' : ''}`}
            key={tab.label}
            onClick={() => {
              if (tab.label === 'HOME') onOpenHome()
              if (tab.label === 'CLASS') onOpenClass()
              if (tab.label === 'NOTEBOOK') onOpenNotebook()
              if (tab.label === 'PROFILE') onOpenProfile()
            }}
          >
            <img className="practice-tab-icon" src={tab.icon} alt="" aria-hidden="true" />
            <span className="practice-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export default PracticePage
