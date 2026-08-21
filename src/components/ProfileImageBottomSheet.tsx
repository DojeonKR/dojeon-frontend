import { useCallback, useEffect, useRef, useState } from 'react'
import './ProfileImageBottomSheet.css'
import closeRoundedIcon from '../assets/close-rounded_icon.svg'
import { defaultProfileImageSrc, profileImageOptions } from '../data/profileImages.ts'
import { useUpdateUserMe } from '../hooks/useUpdateUserMe.ts'
import { isUnauthorizedError } from '../services/apiError.ts'

interface ProfileImageBottomSheetProps {
  currentImageUrl: string | null
  onClose: () => void
  onUnauthorized: () => void
}

const getProfileImageUrl = (src: string) => {
  if (/^(https?:|data:|blob:)/.test(src) || typeof window === 'undefined') {
    return src
  }

  return new URL(src, window.location.origin).href
}

const getFocusableElements = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('aria-hidden'))

function ProfileImageBottomSheet({
  currentImageUrl,
  onClose,
  onUnauthorized,
}: ProfileImageBottomSheetProps) {
  const updateUserMe = useUpdateUserMe()
  const normalizedCurrentImageUrl = getProfileImageUrl(currentImageUrl || defaultProfileImageSrc)
  const [selectedProfileImageUrl, setSelectedProfileImageUrl] = useState(normalizedCurrentImageUrl)
  const [profileImageError, setProfileImageError] = useState('')
  const sheetRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const closeSheetRef = useRef<() => void>(() => {})
  const isSavingProfileImage = updateUserMe.isPending
  const activeProfileImageUrl = selectedProfileImageUrl || normalizedCurrentImageUrl
  const isBusy = isSavingProfileImage

  const closeSheet = useCallback(() => {
    if (isBusy) return

    onClose()
  }, [isBusy, onClose])

  useEffect(() => {
    closeSheetRef.current = closeSheet
  }, [closeSheet])

  useEffect(() => {
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSheetRef.current()
        return
      }

      if (event.key !== 'Tab' || !sheetRef.current) {
        return
      }

      const focusableElements = getFocusableElements(sheetRef.current)

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
  }, [])

  const handleSaveProfileImage = async () => {
    if (!activeProfileImageUrl) return

    setProfileImageError('')

    try {
      await updateUserMe.mutateAsync({ profileImgUrl: activeProfileImageUrl })
      onClose()
    } catch (error) {
      if (isUnauthorizedError(error)) {
        onUnauthorized()
        return
      }

      setProfileImageError(
        error instanceof Error ? error.message : 'Failed to save profile image.',
      )
    }
  }

  return (
    <div className="profile-image-sheet-backdrop" role="presentation" onClick={closeSheet}>
      <section
        className="profile-image-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-image-title"
        ref={sheetRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="profile-image-sheet-header">
          <button
            type="button"
            className="profile-image-sheet-close"
            ref={closeButtonRef}
            onClick={closeSheet}
            aria-label="Close profile image chooser"
          >
            <img src={closeRoundedIcon} alt="" aria-hidden="true" />
          </button>

          <h2 id="profile-image-title" className="profile-image-sheet-title">
            Choose your profile image
          </h2>
          <p className="profile-image-sheet-subtitle">Pick one that suits you below</p>
        </header>

        <div className="profile-image-sheet-body">
          <div className="profile-image-sheet-preview" aria-hidden="true">
            <img src={activeProfileImageUrl} alt="" />
          </div>

          <p className="profile-image-sheet-helper">Pick from below</p>

          <div className="profile-image-sheet-options" aria-label="Profile image options">
            {profileImageOptions.map((image) => {
              const imageUrl = getProfileImageUrl(image.src)
              const isSelected = imageUrl === activeProfileImageUrl

              return (
                <button
                  key={image.id}
                  type="button"
                  className={`profile-image-sheet-option ${
                    isSelected ? 'profile-image-sheet-option-selected' : ''
                  }`}
                  onClick={() => {
                    setProfileImageError('')
                    setSelectedProfileImageUrl(imageUrl)
                  }}
                  aria-label="Choose profile image"
                  aria-pressed={isSelected}
                  disabled={isBusy}
                >
                  <img src={image.src} alt="" aria-hidden="true" />
                </button>
              )
            })}
          </div>

          {profileImageError ? (
            <p className="profile-image-sheet-error" role="alert">
              {profileImageError}
            </p>
          ) : null}
        </div>

        <div className="profile-image-sheet-footer">
          <button
            type="button"
            className="profile-image-sheet-save"
            onClick={handleSaveProfileImage}
            disabled={isBusy}
          >
            {isSavingProfileImage ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ProfileImageBottomSheet
