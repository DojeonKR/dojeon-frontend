import { useState } from 'react'
import './PreferencesPage.css'

interface PreferencesPageProps {
  language: string
  koreanLevel: string
  dailyGoal: string
  koreanGoal: string
  onSave: (values: {
    language: string
    dailyGoal: string
    koreanGoal: string
  }) => void
  onBack: () => void
}

function PreferencesPage({
  language,
  koreanLevel,
  dailyGoal,
  koreanGoal,
  onSave,
  onBack,
}: PreferencesPageProps) {
  const koreanGoalOptions = ['Travel', 'Hobby', 'Study Abroad', 'Career']
  const [draftLanguage, setDraftLanguage] = useState(language)
  const [draftDailyGoal, setDraftDailyGoal] = useState(dailyGoal)
  const [draftKoreanGoal, setDraftKoreanGoal] = useState(koreanGoal)
  const [editing, setEditing] = useState({
    language: false,
    dailyGoal: false,
  })
  const [isKoreanGoalSheetOpen, setIsKoreanGoalSheetOpen] = useState(false)

  const hasPendingChanges =
    draftLanguage !== language ||
    draftDailyGoal !== dailyGoal ||
    draftKoreanGoal !== koreanGoal

  const toggleEditing = (key: 'language' | 'dailyGoal') => {
    setEditing((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const items = [
    {
      label: 'language',
      value: draftLanguage || '-',
      editable: true,
      isEditing: editing.language,
      onEdit: () => toggleEditing('language'),
      onChange: (value: string) => setDraftLanguage(value),
      inputValue: draftLanguage,
    },
    {
      label: 'Korean Level',
      value: koreanLevel || '-',
      editable: false,
    },
    {
      label: 'Daily Goal',
      value: draftDailyGoal || '-',
      editable: true,
      isEditing: editing.dailyGoal,
      onEdit: () => toggleEditing('dailyGoal'),
      onChange: (value: string) => setDraftDailyGoal(value),
      inputValue: draftDailyGoal,
    },
    {
      label: 'Korean Goal',
      value: draftKoreanGoal || '-',
      editable: true,
      usesBottomSheet: true,
      onEdit: () => setIsKoreanGoalSheetOpen(true),
    },
  ]

  return (
    <main className="preferences-screen">
      <section className="preferences-content">
        <header className="preferences-header">
          <button
            type="button"
            className="preferences-back"
            onClick={onBack}
            aria-label="뒤로 가기"
          >
            <svg
              className="preferences-back-icon"
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
          <h1 className="preferences-title">Preferences</h1>
        </header>

        <section className="preferences-list" aria-label="preference details">
          {items.map((item) => (
            <article key={item.label} className="preferences-card">
              <div className="preferences-card-header">
                <p className="preferences-label">{item.label}</p>
              </div>
              <div className="preferences-value-row">
                {'editable' in item && item.editable && item.isEditing ? (
                  <input
                    type="text"
                    className="preferences-input"
                    value={item.inputValue ?? item.value}
                    onChange={(e) => item.onChange(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <p className="preferences-value">{item.value}</p>
                )}
                {'editable' in item && item.editable ? (
                  <button
                    type="button"
                    className="preferences-edit-button"
                    onClick={item.onEdit}
                  >
                    EDIT
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        {hasPendingChanges ? (
          <button
            type="button"
            className="preferences-save-button"
            onClick={() => {
              onSave({
                language: draftLanguage,
                dailyGoal: draftDailyGoal,
                koreanGoal: draftKoreanGoal,
              })
              setEditing({
                language: false,
                dailyGoal: false,
              })
            }}
          >
            Save
          </button>
        ) : null}
      </section>

      {isKoreanGoalSheetOpen ? (
        <div
          className="preferences-bottom-sheet-overlay"
          onClick={() => setIsKoreanGoalSheetOpen(false)}
          aria-hidden="true"
        >
          <section
            className="preferences-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
            aria-label="Korean Goal options"
          >
            <h2 className="preferences-bottom-sheet-title">Korean Goal</h2>
            <div className="preferences-bottom-sheet-options">
              {koreanGoalOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="preferences-bottom-sheet-option"
                  onClick={() => {
                    setDraftKoreanGoal(option)
                    setIsKoreanGoalSheetOpen(false)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default PreferencesPage
