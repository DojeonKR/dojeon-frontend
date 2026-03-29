import './SettingPage.css'
import accountIcon from '../assets/account_icon.png'
import preferenceIcon from '../assets/preference_icon.png'
import notificationIcon from '../assets/notification_icon.png'

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
              <span className="setting-inline-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 18H12.01M9.4 9.2C9.4 7.72 10.58 6.6 12 6.6C13.42 6.6 14.6 7.72 14.6 9.2C14.6 10.96 12 11.44 12 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </span>
              <span className="setting-account-label">FAQ</span>
            </button>
            <button type="button" className="setting-account-item" role="listitem">
              <span className="setting-inline-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8.5 10C8.5 7.51 10.51 5.5 13 5.5C15.49 5.5 17.5 7.51 17.5 10C17.5 12.49 15.49 14.5 13 14.5H11L7.5 18V14.08C6.6 13.17 6 11.89 6 10.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="setting-account-label">Contact Support</span>
            </button>
            <button type="button" className="setting-account-item" role="listitem">
              <span className="setting-inline-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 7.5C5 6.67 5.67 6 6.5 6H17.5C18.33 6 19 6.67 19 7.5V14.5C19 15.33 18.33 16 17.5 16H10L6 19V16H6.5C5.67 16 5 15.33 5 14.5V7.5Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
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
