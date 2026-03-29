import './NotebookPage.css'
import homeIcon from '../assets/home.png'
import editIcon from '../assets/edit.png'
import fileIcon from '../assets/file.png'
import bookOpenIcon from '../assets/book-open.png'
import profileIcon from '../assets/user.png'
import rightArrowIcon from '../assets/icon-park-outline_right-c.png'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: editIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

interface NotebookPageProps {
  userName: string
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
  return (
    <main className="notebook-screen">
      <section className="notebook-content">
        <h1 className="notebook-title">{`${userName}'s personal notebook`}</h1>

        <section className="notebook-section">
          <div className="notebook-section-header">
            <h2 className="notebook-section-title">Vocabualry</h2>
            <button
              type="button"
              className="notebook-section-link"
              onClick={onOpenVocabulary}
            >
              see more
            </button>
          </div>

          <div className="notebook-card-row">
            <article className="notebook-card">
              <p className="notebook-card-title">COURSE 1</p>
              <div className="notebook-card-list notebook-card-list-numbered">
                <p>1. 나무</p>
                <p>2. 생신</p>
                <p>3. 꽃</p>
              </div>
              <button type="button" className="notebook-card-link">
                see more
              </button>
            </article>

            <article className="notebook-card">
              <p className="notebook-card-title">COURSE 2</p>
              <div className="notebook-card-list notebook-card-list-bulleted">
                <p>
                  <span className="notebook-bullet" aria-hidden="true" />
                  <span>나무</span>
                </p>
                <p>
                  <span className="notebook-bullet" aria-hidden="true" />
                  <span>생신</span>
                </p>
                <p>
                  <span className="notebook-bullet" aria-hidden="true" />
                  <span>꽃</span>
                </p>
              </div>
              <button type="button" className="notebook-card-link">
                see more
              </button>
            </article>
          </div>
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

          <div className="notebook-grammar-list">
            {['lesson 5', 'lesson 4', 'lesson 3'].map((lesson) => (
              <article key={lesson} className="notebook-grammar-card">
                <div className="notebook-grammar-top">
                  <p className="notebook-grammar-course">COURSE 1</p>
                  <span className="notebook-grammar-badge">{lesson}</span>
                </div>
                <div className="notebook-grammar-bottom">
                  <p className="notebook-grammar-topic">을까요?</p>
                </div>
                <img
                  src={rightArrowIcon}
                  alt=""
                  aria-hidden="true"
                  className="notebook-grammar-arrow"
                />
              </article>
            ))}
          </div>
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
