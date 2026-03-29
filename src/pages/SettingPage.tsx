import './SettingPage.css'
import accountIcon from '../assets/account_icon.png'
import preferenceIcon from '../assets/preference_icon.png'
import notificationIcon from '../assets/notification_icon.png'
import contactSupportIcon from '../assets/Contact_Support_icon.png'
import faqIcon from '../assets/FAQ_icon.png'
import feedbackIcon from '../assets/Feedback_icon.png'

interface SettingPageProps {
  onBack: () => void
  onOpenAccountInfo: () => void
  onOpenPreferences: () => void
}

function SettingPage({ onBack, onOpenAccountInfo, onOpenPreferences }: SettingPageProps) {
  return (
    <main className="setting-screen">
      <section className="setting-content">
        <header className="setting-header">
          <button
            type="button"
            className="setting-back"
            onClick={onBack}
            aria-label="뒤로 가기"
          >
            <svg
              className="setting-back-icon"
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
          <h1 className="setting-title">Setting</h1>
        </header>

        <section className="setting-section">
          <h2 className="setting-section-title">Account</h2>
          <div className="setting-account-card" role="list" aria-label="account settings">
            <button
              type="button"
              className="setting-account-item"
              role="listitem"
              onClick={onOpenAccountInfo}
            >
              <img
                src={accountIcon}
                alt=""
                className="setting-account-icon"
                aria-hidden="true"
              />
              <span className="setting-account-label">Account info</span>
            </button>
            <button
              type="button"
              className="setting-account-item"
              role="listitem"
              onClick={onOpenPreferences}
            >
              <img
                src={preferenceIcon}
                alt=""
                className="setting-account-icon"
                aria-hidden="true"
              />
              <span className="setting-account-label">Preferences</span>
            </button>
            <button type="button" className="setting-account-item" role="listitem">
              <img
                src={notificationIcon}
                alt=""
                className="setting-account-icon"
                aria-hidden="true"
              />
              <span className="setting-account-label">Notifications</span>
            </button>
          </div>
        </section>

        <section className="setting-section setting-section-support">
          <h2 className="setting-section-title">Support</h2>
          <div className="setting-account-card" role="list" aria-label="support settings">
            <button type="button" className="setting-account-item" role="listitem">
              <img src={faqIcon} alt="" className="setting-account-icon" aria-hidden="true" />
              <span className="setting-account-label">FAQ</span>
            </button>
            <button type="button" className="setting-account-item" role="listitem">
              <img
                src={contactSupportIcon}
                alt=""
                className="setting-account-icon"
                aria-hidden="true"
              />
              <span className="setting-account-label">Contact Support</span>
            </button>
            <button type="button" className="setting-account-item" role="listitem">
              <img
                src={feedbackIcon}
                alt=""
                className="setting-account-icon"
                aria-hidden="true"
              />
              <span className="setting-account-label">Feedback</span>
            </button>
          </div>
        </section>

        <button type="button" className="setting-signout-button">
          Sign out
        </button>

        <div className="setting-policy-links">
          <button type="button" className="setting-policy-link">
            Terms and conditions
          </button>
          <button type="button" className="setting-policy-link">
            Privacy Policy
          </button>
          <button type="button" className="setting-policy-link">
            License
          </button>
        </div>
      </section>
    </main>
  )
}

export default SettingPage
