import { Fragment, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import './AccountInfoPage.css'
import backArrowIcon from '../assets/BackArrow.svg'
import editIcon from '../assets/edit.svg'
import trashIcon from '../assets/trash.svg'

interface AccountInfoPageProps {
  email: string
  username: string
  nickname: string
  hasPassword: boolean
  phoneNumber: string
  ageGroup: string
  birthday: string
  onSave: (values: {
    nickname?: string
    phoneNumber?: string
    ageGroup?: string
    birthday?: string
    passwordChange?: {
      currentPassword: string
      newPassword: string
    }
  }) => void | Promise<void>
  isSaving?: boolean
  saveError?: string | null
  onClearSaveError?: () => void
  onBack: () => void
  onDeleteAccount?: () => void | Promise<void>
  isDeletingAccount?: boolean
}

type EditableAccountField = 'nickname' | 'password' | 'phoneNumber' | 'ageGroupOrBirthday'

const getFocusableElements = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('aria-hidden'))

const formatBirthdayForDisplay = (value: string) => {
  const datePart = value.trim().split('T')[0] ?? ''

  return datePart.replaceAll('-', '.')
}

function AccountInfoPage({
  email,
  username,
  nickname,
  hasPassword,
  phoneNumber,
  ageGroup,
  birthday,
  onSave,
  isSaving = false,
  saveError = null,
  onClearSaveError,
  onBack,
  onDeleteAccount,
  isDeletingAccount = false,
}: AccountInfoPageProps) {
  const [editTextValue, setEditTextValue] = useState('')
  const [editAgeGroup, setEditAgeGroup] = useState('')
  const [editBirthday, setEditBirthday] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [activeEditField, setActiveEditField] = useState<EditableAccountField | null>(null)
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false)
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false)
  const [sheetDragY, setSheetDragY] = useState(0)
  const [isSheetDragging, setIsSheetDragging] = useState(false)
  const sheetRef = useRef<HTMLElement | null>(null)
  const initialSheetFocusRef = useRef<HTMLInputElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const closeSheetRef = useRef<() => void>(() => {})
  const sheetPointerStartYRef = useRef<number | null>(null)
  const sheetDragYRef = useRef(0)
  const passwordRules = [
    {
      id: 'length',
      message: '8 characters required.',
      isSatisfied: newPassword.length >= 8,
    },
    {
      id: 'special',
      message: '1 special character required.',
      isSatisfied: /[^A-Za-z0-9]/.test(newPassword),
    },
    {
      id: 'uppercase',
      message: '1 uppercase required.',
      isSatisfied: /[A-Z]/.test(newPassword),
    },
    {
      id: 'lowercase',
      message: '1 lowercase required.',
      isSatisfied: /[a-z]/.test(newPassword),
    },
    {
      id: 'number',
      message: '1 number required.',
      isSatisfied: /[0-9]/.test(newPassword),
    },
  ]
  const isPasswordChangeReady =
    currentPassword.trim().length > 0 && newPassword.trim().length > 0
  const isPasswordRulesValid = passwordRules.every((rule) => rule.isSatisfied)
  const isAnySheetOpen = activeEditField !== null || isDeleteSheetOpen
  const displayedAgeGroupOrBirthday = [ageGroup, formatBirthdayForDisplay(birthday)]
    .filter(Boolean)
    .join(' / ')
  const isEditSaveDisabled =
    isSaving ||
    (activeEditField === 'nickname' && editTextValue === nickname) ||
    (activeEditField === 'phoneNumber' && editTextValue === phoneNumber) ||
    (activeEditField === 'ageGroupOrBirthday' &&
      editAgeGroup === ageGroup &&
      editBirthday === formatBirthdayForDisplay(birthday)) ||
    (activeEditField === 'password' && (!isPasswordChangeReady || !isPasswordRulesValid))

  const resetSheetDrag = () => {
    sheetPointerStartYRef.current = null
    sheetDragYRef.current = 0
    setIsSheetDragging(false)
    setSheetDragY(0)
  }

  const closeSheet = useCallback(() => {
    if (isSaving || isDeletingAccount) return

    setActiveEditField(null)
    setIsDeleteSheetOpen(false)
    setIsDeleteConfirmed(false)
    setEditTextValue('')
    setEditAgeGroup('')
    setEditBirthday('')
    setCurrentPassword('')
    setNewPassword('')
    setPasswordMessage('')
    onClearSaveError?.()
    resetSheetDrag()
  }, [isDeletingAccount, isSaving, onClearSaveError])

  useEffect(() => {
    closeSheetRef.current = closeSheet
  }, [closeSheet])

  const openEditSheet = (field: EditableAccountField) => {
    onClearSaveError?.()
    setCurrentPassword('')
    setNewPassword('')
    setPasswordMessage('')

    if (field === 'nickname') {
      setEditTextValue(nickname)
    }

    if (field === 'phoneNumber') {
      setEditTextValue(phoneNumber)
    }

    if (field === 'ageGroupOrBirthday') {
      setEditAgeGroup(ageGroup)
      setEditBirthday(formatBirthdayForDisplay(birthday))
    }

    setActiveEditField(field)
  }

  const handleSave = async () => {
    if (isEditSaveDisabled) return

    if (activeEditField === 'password' && !isPasswordChangeReady) {
      setPasswordMessage('Enter your current and new password.')
      return
    }

    if (isPasswordChangeReady && !isPasswordRulesValid) {
      setPasswordMessage('Password does not meet all requirements.')
      return
    }

    try {
      await onSave({
        nickname: activeEditField === 'nickname' ? editTextValue : undefined,
        phoneNumber: activeEditField === 'phoneNumber' ? editTextValue : undefined,
        ageGroup: activeEditField === 'ageGroupOrBirthday' ? editAgeGroup : undefined,
        birthday: activeEditField === 'ageGroupOrBirthday' ? editBirthday : undefined,
        passwordChange: isPasswordChangeReady
          ? {
              currentPassword: currentPassword.trim(),
              newPassword: newPassword.trim(),
            }
          : undefined,
      })
      setCurrentPassword('')
      setNewPassword('')
      setPasswordMessage('')
      closeSheet()
    } catch {
      // The parent mutation exposes the error message through saveError.
    }
  }

  const handleDeleteAccount = async () => {
    if (!isDeleteConfirmed || !onDeleteAccount) return

    await onDeleteAccount()
  }

  const handleSheetPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isSaving || isDeletingAccount) return

    sheetPointerStartYRef.current = event.clientY
    setIsSheetDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleSheetPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (sheetPointerStartYRef.current === null || isSaving || isDeletingAccount) return

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
      closeSheet()
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

  useEffect(() => {
    if (!isAnySheetOpen) return

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    initialSheetFocusRef.current?.focus()

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
  }, [isAnySheetOpen])

  const items = [
    { label: 'Email', value: email || '-' },
    { label: 'Username', value: username || '-' },
    {
      label: 'Nickname',
      value: nickname || '-',
      editable: true,
      editField: 'nickname' as const,
    },
    {
      label: 'Password',
      value: hasPassword ? '**********' : 'Not available',
      editable: hasPassword,
      editField: 'password' as const,
    },
    {
      label: 'Phone number',
      value: phoneNumber || '-',
      editable: true,
      editField: 'phoneNumber' as const,
    },
    {
      label: 'Age',
      value: displayedAgeGroupOrBirthday || '-',
      editable: true,
      editField: 'ageGroupOrBirthday' as const,
    },
  ]

  const editSheetConfig =
    activeEditField === 'nickname'
      ? {
          title: 'Change Nickname',
          value: editTextValue,
          onChange: setEditTextValue,
          inputType: 'text',
        }
      : activeEditField === 'phoneNumber'
        ? {
            title: 'Change Phone Number',
            value: editTextValue,
            onChange: setEditTextValue,
            inputType: 'text',
          }
        : activeEditField === 'ageGroupOrBirthday'
          ? {
              title: 'Change Age Group / Birthday',
              value: '',
              onChange: setEditTextValue,
              inputType: 'text',
            }
          : null

  return (
    <main className="account-info-screen">
      <section className="account-info-content">
        <header className="account-info-header">
          <button
            type="button"
            className="account-info-back"
            onClick={onBack}
            aria-label="Go back"
          >
            <img
              src={backArrowIcon}
              alt=""
              className="account-info-back-icon"
              aria-hidden="true"
            />
          </button>
          <h1 className="account-info-title">Account info</h1>
        </header>

        <section className="account-info-list" aria-label="account details">
          {items.map((item) => (
            <article
              key={item.label}
              className={`account-info-card ${
                'editable' in item && item.editable ? 'account-info-card-editable' : ''
              }`}
            >
              <div className="account-info-card-header">
                <p className="account-info-label">{item.label}</p>
              </div>
              <div className="account-info-value-row">
                <p className="account-info-value">{item.value}</p>
                {'editable' in item && item.editable ? (
                  <button
                    type="button"
                    className="account-info-edit-button"
                    onClick={() => openEditSheet(item.editField)}
                    aria-label={`Change ${item.label}`}
                  >
                    <img
                      src={editIcon}
                      alt=""
                      className="account-info-edit-icon"
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <button
          type="button"
          className="account-info-delete-button"
          onClick={() => setIsDeleteSheetOpen(true)}
        >
          <img src={trashIcon} alt="" aria-hidden="true" />
          <span>Delete Account</span>
        </button>
      </section>

      {isAnySheetOpen ? (
        <div className="account-info-sheet-backdrop" role="presentation" onClick={closeSheet}>
          <section
            className={`account-info-sheet ${
              isSheetDragging ? 'account-info-sheet-dragging' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-info-sheet-title"
            ref={sheetRef}
            style={{ transform: `translateY(${sheetDragY}px)` }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="account-info-sheet-drag-area"
              aria-hidden="true"
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={handleSheetPointerUp}
              onPointerCancel={handleSheetPointerCancel}
            >
              <span className="account-info-sheet-handle" />
            </div>

            {activeEditField ? (
              <div className="account-info-sheet-body">
                <h2 id="account-info-sheet-title" className="account-info-sheet-title">
                  {activeEditField === 'password' ? 'Change Password' : editSheetConfig?.title}
                </h2>
                {activeEditField === 'password' ? (
                  <Fragment>
                    <input
                      type="password"
                      className="account-info-sheet-input"
                      value={currentPassword}
                      onChange={(event) => {
                        setCurrentPassword(event.target.value)
                        setPasswordMessage('')
                      }}
                      placeholder="Current password"
                      ref={initialSheetFocusRef}
                    />
                    <input
                      type="password"
                      className="account-info-sheet-input"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value)
                        setPasswordMessage('')
                      }}
                      placeholder="New password"
                    />
                    <ul className="account-info-password-requirements" aria-label="Password rules">
                      {passwordRules.map((rule) => (
                        <li
                          key={rule.id}
                          className={`account-info-password-requirement ${
                            rule.isSatisfied
                              ? 'account-info-password-requirement-satisfied'
                              : 'account-info-password-requirement-unsatisfied'
                          }`}
                        >
                          <span className="account-info-password-requirement-icon">
                            {rule.isSatisfied ? '✓' : '×'}
                          </span>
                          <span>{rule.message}</span>
                        </li>
                      ))}
                    </ul>
                    {passwordMessage ? (
                      <p className="account-info-message" role="alert">
                        {passwordMessage}
                      </p>
                    ) : null}
                  </Fragment>
                ) : activeEditField === 'ageGroupOrBirthday' ? (
                  <div className="account-info-sheet-fields">
                    <label className="account-info-sheet-field">
                      <span>Age group</span>
                      <input
                        type="text"
                        className="account-info-sheet-input"
                        value={editAgeGroup}
                        onChange={(event) => setEditAgeGroup(event.target.value)}
                        ref={initialSheetFocusRef}
                      />
                    </label>
                    <label className="account-info-sheet-field">
                      <span>Birthday</span>
                      <input
                        type="text"
                        className="account-info-sheet-input"
                        value={editBirthday}
                        onChange={(event) => setEditBirthday(event.target.value)}
                      />
                    </label>
                  </div>
                ) : editSheetConfig ? (
                  <input
                    type={editSheetConfig.inputType}
                    className="account-info-sheet-input"
                    value={editSheetConfig.value}
                    onChange={(event) => editSheetConfig.onChange(event.target.value)}
                    ref={initialSheetFocusRef}
                  />
                ) : null}
                <div className="account-info-sheet-actions">
                  <button
                    type="button"
                    className="account-info-sheet-button account-info-sheet-button-cancel"
                    onClick={closeSheet}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="account-info-sheet-button account-info-sheet-button-primary"
                    onClick={() => void handleSave()}
                    disabled={isEditSaveDisabled}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {saveError ? (
                  <p className="account-info-save-error" role="alert">
                    {saveError}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="account-info-sheet-body">
                <h2 id="account-info-sheet-title" className="account-info-sheet-title">
                  Delete Account
                </h2>
                <p className="account-info-delete-copy">
                  If you delete your account,
                  <br />
                  you won&apos;t be able to create one again
                  <br />
                  with the same email for 3 years. Continue?
                </p>
                <label className="account-info-delete-confirm">
                  <input
                    type="checkbox"
                    checked={isDeleteConfirmed}
                    onChange={(event) => setIsDeleteConfirmed(event.target.checked)}
                    ref={initialSheetFocusRef}
                  />
                  <span>Yes, I want to delete my account</span>
                </label>
                <div className="account-info-sheet-actions account-info-delete-actions">
                  <button
                    type="button"
                    className="account-info-sheet-button account-info-sheet-button-cancel"
                    onClick={closeSheet}
                    disabled={isDeletingAccount}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="account-info-sheet-button account-info-sheet-button-primary"
                    onClick={() => void handleDeleteAccount()}
                    disabled={!isDeleteConfirmed || !onDeleteAccount || isDeletingAccount}
                  >
                    {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default AccountInfoPage
