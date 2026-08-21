import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import './PreferencesPage.css'
import backArrowIcon from '../assets/BackArrow.svg'
import checkIcon from '../assets/check_icon_gray.svg'
import editIcon from '../assets/edit.svg'
import {
  getOnboardingPreferenceLabel,
  normalizeOnboardingPreferenceValue,
  onboardingPreferenceChoices,
  type OnboardingChoice,
  type OnboardingPreferenceKey,
} from '../data/onboardingPreferences'

interface PreferencesPageProps {
  language: string
  koreanLevel: string
  dailyGoal: string
  koreanGoal: string
  onSave: (values: {
    language: string
    koreanLevel: string
    dailyGoal: string
    koreanGoal: string
  }) => void | Promise<void>
  isSaving?: boolean
  saveError?: string | null
  onClearSaveError?: () => void
  onBack: () => void
}

type PreferenceKey = OnboardingPreferenceKey

interface PreferenceDefinition {
  key: PreferenceKey
  label: string
  options: OnboardingChoice[]
}

const preferenceDefinitions: PreferenceDefinition[] = [
  {
    key: 'language',
    label: 'Language',
    options: onboardingPreferenceChoices.language,
  },
  {
    key: 'koreanLevel',
    label: 'Korean Level',
    options: onboardingPreferenceChoices.koreanLevel,
  },
  {
    key: 'dailyGoal',
    label: 'Daily Goal',
    options: onboardingPreferenceChoices.dailyGoal,
  },
  {
    key: 'koreanGoal',
    label: 'Korean Goal',
    options: onboardingPreferenceChoices.koreanGoal,
  },
]

const isSamePreferenceValue = (key: PreferenceKey, firstValue: string, secondValue: string) => {
  return (
    normalizeOnboardingPreferenceValue(key, firstValue) ===
    normalizeOnboardingPreferenceValue(key, secondValue)
  )
}

const getFocusableElements = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('aria-hidden'))

function PreferencesPage({
  language,
  koreanLevel,
  dailyGoal,
  koreanGoal,
  onSave,
  isSaving = false,
  saveError = null,
  onClearSaveError,
  onBack,
}: PreferencesPageProps) {
  const [activePreferenceKey, setActivePreferenceKey] = useState<PreferenceKey | null>(null)
  const [selectedValue, setSelectedValue] = useState('')
  const [sheetDragY, setSheetDragY] = useState(0)
  const [isSheetDragging, setIsSheetDragging] = useState(false)
  const sheetRef = useRef<HTMLElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const closeSheetRef = useRef<() => void>(() => {})
  const sheetPointerStartYRef = useRef<number | null>(null)
  const sheetDragYRef = useRef(0)
  const currentValues = { language, koreanLevel, dailyGoal, koreanGoal }

  const activePreference = preferenceDefinitions.find(({ key }) => key === activePreferenceKey)
  const activeValue = activePreferenceKey ? currentValues[activePreferenceKey] : ''
  const activeOptionIndex =
    activePreference?.options.findIndex((option) =>
      isSamePreferenceValue(activePreference.key, selectedValue, option.id),
    ) ?? -1
  const tabbableOptionIndex = activeOptionIndex >= 0 ? activeOptionIndex : 0
  const isSaveDisabled =
    !activePreferenceKey ||
    !selectedValue ||
    isSamePreferenceValue(activePreferenceKey, activeValue, selectedValue) ||
    isSaving

  const resetSheetDrag = useCallback(() => {
    sheetPointerStartYRef.current = null
    sheetDragYRef.current = 0
    setIsSheetDragging(false)
    setSheetDragY(0)
  }, [])

  const openEditSheet = (key: PreferenceKey) => {
    onClearSaveError?.()
    resetSheetDrag()
    setActivePreferenceKey(key)
    setSelectedValue(normalizeOnboardingPreferenceValue(key, currentValues[key]))
  }

  const closeEditSheet = useCallback(() => {
    if (isSaving) return
    setActivePreferenceKey(null)
    setSelectedValue('')
    onClearSaveError?.()
    resetSheetDrag()
  }, [isSaving, onClearSaveError, resetSheetDrag])

  useEffect(() => {
    closeSheetRef.current = closeEditSheet
  }, [closeEditSheet])

  useEffect(() => {
    if (!activePreferenceKey || !sheetRef.current) return

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const selectedOption = sheetRef.current.querySelector<HTMLElement>(
      '[role="radio"][aria-checked="true"]',
    )
    const firstOption = sheetRef.current.querySelector<HTMLElement>('[role="radio"]')
    ;(selectedOption ?? firstOption)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSheetRef.current()
        return
      }

      if (event.key !== 'Tab' || !sheetRef.current) return

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
  }, [activePreferenceKey])

  const handleSheetPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isSaving) return

    sheetPointerStartYRef.current = event.clientY
    setIsSheetDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleSheetPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (sheetPointerStartYRef.current === null || isSaving) return

    const nextDragY = Math.max(0, event.clientY - sheetPointerStartYRef.current)
    sheetDragYRef.current = nextDragY
    setSheetDragY(nextDragY)
  }

  const handleSheetPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    sheetPointerStartYRef.current = null
    setIsSheetDragging(false)

    if (sheetDragYRef.current > 72) {
      closeEditSheet()
      return
    }

    sheetDragYRef.current = 0
    setSheetDragY(0)
  }

  const handleSheetPointerCancel = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    resetSheetDrag()
  }

  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    optionIndex: number,
  ) => {
    if (!activePreference) return

    const lastOptionIndex = activePreference.options.length - 1
    let nextOptionIndex: number

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextOptionIndex = optionIndex === lastOptionIndex ? 0 : optionIndex + 1
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        nextOptionIndex = optionIndex === 0 ? lastOptionIndex : optionIndex - 1
        break
      case 'Home':
        nextOptionIndex = 0
        break
      case 'End':
        nextOptionIndex = lastOptionIndex
        break
      default:
        return
    }

    event.preventDefault()
    setSelectedValue(activePreference.options[nextOptionIndex].id)
    const optionElements =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    optionElements?.[nextOptionIndex]?.focus()
  }

  const handleSave = async () => {
    if (!activePreferenceKey || isSaveDisabled) return

    const nextValues = {
      ...currentValues,
      [activePreferenceKey]: selectedValue,
    }

    try {
      await onSave(nextValues)
      closeEditSheet()
    } catch {
      // The parent mutation exposes the error message through saveError.
    }
  }

  return (
    <main className="preferences-screen">
      <section className="preferences-content">
        <header className="preferences-header">
          <button
            type="button"
            className="preferences-back"
            onClick={onBack}
            aria-label="Go back"
          >
            <img
              src={backArrowIcon}
              alt=""
              className="preferences-back-icon"
              aria-hidden="true"
            />
          </button>
          <h1 className="preferences-title">Preferences</h1>
        </header>

        <section className="preferences-list" aria-label="Preference details">
          {preferenceDefinitions.map((preference) => (
            <article key={preference.key} className="preferences-card">
              <div className="preferences-card-header">
                <p className="preferences-label">{preference.label}</p>
              </div>
              <div className="preferences-value-row">
                <p className="preferences-value">
                  {getOnboardingPreferenceLabel(
                    preference.key,
                    currentValues[preference.key],
                  )}
                </p>
                <button
                  type="button"
                  className="preferences-edit-button"
                  onClick={() => openEditSheet(preference.key)}
                  disabled={isSaving}
                  aria-label={`Change ${preference.label}`}
                >
                  <img
                    src={editIcon}
                    alt=""
                    className="preferences-edit-icon"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>

      {activePreference ? (
        <div className="preferences-sheet-backdrop" role="presentation" onClick={closeEditSheet}>
          <section
            className={`preferences-sheet ${isSheetDragging ? 'preferences-sheet-dragging' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preferences-sheet-title"
            ref={sheetRef}
            style={{ transform: `translateY(${sheetDragY}px)` }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="preferences-sheet-drag-area"
              aria-hidden="true"
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={handleSheetPointerUp}
              onPointerCancel={handleSheetPointerCancel}
            >
              <span className="preferences-sheet-handle" />
            </div>

            <div className="preferences-sheet-body">
              <h2 id="preferences-sheet-title" className="preferences-sheet-title">
                {activePreference.label}
              </h2>

              <div
                className="preferences-sheet-options"
                role="radiogroup"
                aria-labelledby="preferences-sheet-title"
              >
                {activePreference.options.map((option, optionIndex) => {
                  const isSelected = isSamePreferenceValue(
                    activePreference.key,
                    selectedValue,
                    option.id,
                  )

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`preferences-sheet-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedValue(option.id)}
                      onKeyDown={(event) => handleOptionKeyDown(event, optionIndex)}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={optionIndex === tabbableOptionIndex ? 0 : -1}
                    >
                      <span>{option.label}</span>
                      <img
                        src={checkIcon}
                        alt=""
                        className="preferences-sheet-check-icon"
                        aria-hidden="true"
                      />
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className="preferences-sheet-save-button"
                disabled={isSaveDisabled}
                onClick={() => void handleSave()}
              >
                {isSaving ? 'SAVING...' : 'SAVE'}
              </button>
              {saveError ? (
                <p className="preferences-save-error" role="alert">
                  {saveError}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default PreferencesPage
