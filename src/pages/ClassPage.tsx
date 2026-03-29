import './ClassPage.css'
import homeIcon from '../assets/home.png'
import editIcon from '../assets/edit.png'
import fileIcon from '../assets/file.png'
import bookOpenIcon from '../assets/book-open.png'
import profileIcon from '../assets/user.png'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: editIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

interface ClassPageProps {
  onOpenHome: () => void
  onOpenPractice: () => void
}

function ClassPage({ onOpenHome, onOpenPractice }: ClassPageProps) {
  return (
    <main className="class-screen">
      <section className="class-content">
        <section className="class-progress-card">
          <p className="class-progress-title">My progress</p>
          <p className="class-progress-complete">18% complete</p>
          <div className="class-progress-bar" role="list" aria-label="class progress">
            <span className="class-progress-track" aria-hidden="true" />
            <span className="class-progress-fill" style={{ width: '18%' }} aria-hidden="true" />
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={`class-progress-dot ${
                  index === 0 ? 'class-progress-dot-past' : 'class-progress-dot-upcoming'
                }`}
                style={{ left: `${((index + 1) / 6) * 100}%` }}
                role="listitem"
              />
            ))}
          </div>
        </section>

        <section className="class-course-list" aria-label="courses">
          {Array.from({ length: 5 }).map((_, index) => (
            <button key={index} type="button" className="class-course-item">
              <span className="class-course-label">{`Course ${index + 1}`}</span>
              <svg
                className="class-course-arrow"
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
          ))}
        </section>
      </section>

      <nav className="class-bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`class-tab ${tab.label === 'CLASS' ? 'class-tab-active' : ''}`}
            onClick={() => {
              if (tab.label === 'HOME') {
                onOpenHome()
              }

              if (tab.label === 'PRACTICE') {
                onOpenPractice()
              }
            }}
          >
            <img className="class-tab-icon" src={tab.icon} alt="" aria-hidden="true" />
            <span className="class-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export default ClassPage
