import { Fragment, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import './SettingPage.css'
import backArrowIcon from '../assets/BackArrow.svg'
import accountIcon from '../assets/profile.svg'
import preferenceIcon from '../assets/preferences.svg'
import notificationIcon from '../assets/notification.svg'
import contactSupportIcon from '../assets/support.svg'
import faqIcon from '../assets/question.svg'
import feedbackIcon from '../assets/Feedback_icon.svg'
import logoutIcon from '../assets/logout.svg'

interface SettingPageProps {
  onBack: () => void
  onOpenAccountInfo: () => void
  onOpenPreferences: () => void
  isPushNotificationOn: boolean
  onTogglePushNotifications: () => void | Promise<void>
  onSignOut: () => void
  isSigningOut?: boolean
  isSavingNotification?: boolean
  notificationError?: string | null
  onClearNotificationError?: () => void
}

const policyLinks = ['Terms and conditions', 'Privacy Policy', 'License']

const getFocusableElements = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('aria-hidden'))

function SettingPage({
  onBack,
  onOpenAccountInfo,
  onOpenPreferences,
  isPushNotificationOn,
  onTogglePushNotifications,
  onSignOut,
  isSigningOut = false,
  isSavingNotification = false,
  notificationError = null,
  onClearNotificationError,
}: SettingPageProps) {
  const [isSignOutSheetOpen, setIsSignOutSheetOpen] = useState(false)
  const [isSignOutSheetDragging, setIsSignOutSheetDragging] = useState(false)
  const [signOutSheetDragY, setSignOutSheetDragY] = useState(0)
  const signOutSheetRef = useRef<HTMLElement | null>(null)
  const signOutSheetCancelButtonRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const closeSignOutSheetRef = useRef<() => void>(() => {})
  const signOutSheetPointerStartYRef = useRef<number | null>(null)
  const signOutSheetDragYRef = useRef(0)

  const handleTogglePushNotifications = async () => {
    onClearNotificationError?.()

    try {
      await onTogglePushNotifications()
    } catch {
      // The parent mutation exposes non-authentication failures through notificationError.
    }
  }

  const openSignOutSheet = () => {
    setIsSignOutSheetOpen(true)
  }

  const closeSignOutSheet = useCallback(() => {
    if (!isSigningOut) {
      setIsSignOutSheetOpen(false)
      setIsSignOutSheetDragging(false)
      signOutSheetDragYRef.current = 0
      setSignOutSheetDragY(0)
    }
  }, [isSigningOut])

  const confirmSignOut = () => {
    onSignOut()
  }

  useEffect(() => {
    closeSignOutSheetRef.current = closeSignOutSheet
  }, [closeSignOutSheet])

  useEffect(() => {
    if (!isSignOutSheetOpen) return

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    signOutSheetCancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSignOutSheetRef.current()
        return
      }

      if (event.key !== 'Tab' || !signOutSheetRef.current) {
        return
      }

      const focusableElements = getFocusableElements(signOutSheetRef.current)

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [isSignOutSheetOpen])

  const handleSignOutSheetPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isSigningOut) return

    signOutSheetPointerStartYRef.current = event.clientY
    setIsSignOutSheetDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleSignOutSheetPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (signOutSheetPointerStartYRef.current === null || isSigningOut) return

    const nextDragY = Math.max(0, event.clientY - signOutSheetPointerStartYRef.current)
    signOutSheetDragYRef.current = nextDragY
    setSignOutSheetDragY(nextDragY)
  }

  const handleSignOutSheetPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    signOutSheetPointerStartYRef.current = null
    setIsSignOutSheetDragging(false)

    if (signOutSheetDragYRef.current > 72) {
      closeSignOutSheet()
      return
    }

    signOutSheetDragYRef.current = 0
    setSignOutSheetDragY(0)
  }

  const handleSignOutSheetPointerCancel = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    signOutSheetPointerStartYRef.current = null
    setIsSignOutSheetDragging(false)
    signOutSheetDragYRef.current = 0
    setSignOutSheetDragY(0)
  }

  return (
    <main className="setting-screen">
      <section className="setting-content">
        <header className="setting-header">
          <button
            type="button"
            className="setting-back"
            onClick={onBack}
            aria-label="Go back"
          >
            <img
              src={backArrowIcon}
              alt=""
              className="setting-back-icon"
              aria-hidden="true"
            />
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
            <button
              type="button"
              className="setting-account-item"
              role="listitem"
              aria-pressed={isPushNotificationOn}
              disabled={isSavingNotification}
              onClick={() => void handleTogglePushNotifications()}
            >
              <img
                src={notificationIcon}
                alt=""
                className="setting-account-icon"
                aria-hidden="true"
              />
              <span className="setting-account-label">Notifications</span>
              <span
                className={`setting-notification-toggle ${
                  isPushNotificationOn ? 'setting-notification-toggle-on' : ''
                }`}
                aria-hidden="true"
              >
                <span className="setting-notification-toggle-thumb" />
              </span>
            </button>
          </div>
          {notificationError ? (
            <p className="setting-notification-error" role="alert">
              {notificationError}
            </p>
          ) : null}
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

        <button
          type="button"
          className="setting-signout-button"
          onClick={openSignOutSheet}
          disabled={isSigningOut}
        >
          <img src={logoutIcon} alt="" className="setting-signout-icon" aria-hidden="true" />
          <span>{isSigningOut ? 'Signing out...' : 'Log Out'}</span>
        </button>

        <div className="setting-policy-links">
          {policyLinks.map((label, index) => (
            <Fragment key={label}>
              {index > 0 ? (
                <span className="setting-policy-separator" aria-hidden="true">
                  |
                </span>
              ) : null}
              <button type="button" className="setting-policy-link">
                {label}
              </button>
            </Fragment>
          ))}
        </div>
      </section>

      {isSignOutSheetOpen ? (
        <div className="setting-signout-sheet-backdrop" role="presentation" onClick={closeSignOutSheet}>
          <section
            className={`setting-signout-sheet ${
              isSignOutSheetDragging ? 'setting-signout-sheet-dragging' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="setting-signout-sheet-title"
            ref={signOutSheetRef}
            style={{ transform: `translateY(${signOutSheetDragY}px)` }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="setting-signout-sheet-drag-area"
              aria-hidden="true"
              onPointerDown={handleSignOutSheetPointerDown}
              onPointerMove={handleSignOutSheetPointerMove}
              onPointerUp={handleSignOutSheetPointerUp}
              onPointerCancel={handleSignOutSheetPointerCancel}
            >
              <span className="setting-signout-sheet-handle" />
            </div>
            <div className="setting-signout-sheet-body">
              <h2 id="setting-signout-sheet-title" className="setting-signout-sheet-title">
                Log Out
              </h2>
              <p className="setting-signout-sheet-copy">Are you sure want to log out?</p>
              <div className="setting-signout-sheet-actions">
                <button
                  type="button"
                  className="setting-signout-sheet-button setting-signout-sheet-button-cancel"
                  ref={signOutSheetCancelButtonRef}
                  onClick={closeSignOutSheet}
                  disabled={isSigningOut}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="setting-signout-sheet-button setting-signout-sheet-button-confirm"
                  onClick={confirmSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Logging out...' : 'Log Out'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default SettingPage
