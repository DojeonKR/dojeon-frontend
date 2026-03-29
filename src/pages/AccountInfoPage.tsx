import { useState } from 'react'
import './AccountInfoPage.css'

interface AccountInfoPageProps {
  email: string
  username: string
  nickname: string
  password: string
  phoneNumber: string
  ageGroupOrBirthday: string
  onSave: (values: {
    nickname: string
    password: string
    phoneNumber: string
    ageGroupOrBirthday: string
  }) => void
  onBack: () => void
}

function AccountInfoPage({
  email,
  username,
  nickname,
  password,
  phoneNumber,
  ageGroupOrBirthday,
  onSave,
  onBack,
}: AccountInfoPageProps) {
  const [draftNickname, setDraftNickname] = useState(nickname)
  const [draftPassword, setDraftPassword] = useState(password)
  const [draftPhoneNumber, setDraftPhoneNumber] = useState(phoneNumber)
  const [draftAgeGroupOrBirthday, setDraftAgeGroupOrBirthday] = useState(ageGroupOrBirthday)
  const [editing, setEditing] = useState({
    nickname: false,
    password: false,
    phoneNumber: false,
    ageGroupOrBirthday: false,
  })
  const hasPendingChanges =
    draftNickname !== nickname ||
    draftPassword !== password ||
    draftPhoneNumber !== phoneNumber ||
    draftAgeGroupOrBirthday !== ageGroupOrBirthday
  const toggleEditing = (
    key: 'nickname' | 'password' | 'phoneNumber' | 'ageGroupOrBirthday',
  ) => {
    setEditing((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const maskedPassword = draftPassword ? '*'.repeat(Math.max(draftPassword.length, 8)) : '-'
  const items = [
    { label: 'Email', value: email || '-' },
    { label: 'Username', value: username || '-' },
    {
      label: 'Nickname',
      value: draftNickname || '-',
      editable: true,
      isEditing: editing.nickname,
      onEdit: () => toggleEditing('nickname'),
      onChange: (value: string) => setDraftNickname(value),
      inputValue: draftNickname,
    },
    {
      label: 'Password',
      value: maskedPassword,
      editable: true,
      isEditing: editing.password,
      onEdit: () => toggleEditing('password'),
      onChange: (value: string) => setDraftPassword(value),
      inputType: 'password',
      inputValue: draftPassword,
    },
    {
      label: 'Phone number',
      value: draftPhoneNumber || '-',
      editable: true,
      isEditing: editing.phoneNumber,
      onEdit: () => toggleEditing('phoneNumber'),
      onChange: (value: string) => setDraftPhoneNumber(value),
      inputValue: draftPhoneNumber,
    },
    {
      label: 'Age group / Birthday',
      value: draftAgeGroupOrBirthday || '-',
      editable: true,
      isEditing: editing.ageGroupOrBirthday,
      onEdit: () => toggleEditing('ageGroupOrBirthday'),
      onChange: (value: string) => setDraftAgeGroupOrBirthday(value),
      inputValue: draftAgeGroupOrBirthday,
    },
  ]

  return (
    <main className="account-info-screen">
      <section className="account-info-content">
        <header className="account-info-header">
          <button
            type="button"
            className="account-info-back"
            onClick={onBack}
            aria-label="뒤로 가기"
          >
            <svg
              className="account-info-back-icon"
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
          <h1 className="account-info-title">Account Info</h1>
        </header>

        <section className="account-info-list" aria-label="account details">
          {items.map((item) => (
            <article key={item.label} className="account-info-card">
              <div className="account-info-card-header">
                <p className="account-info-label">{item.label}</p>
              </div>
              <div className="account-info-value-row">
                {'editable' in item && item.editable && item.isEditing ? (
                  <input
                    type={item.inputType ?? 'text'}
                    className="account-info-input"
                    value={item.inputValue ?? item.value}
                    onChange={(e) => item.onChange(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <p className="account-info-value">{item.value}</p>
                )}
                {'editable' in item && item.editable ? (
                  <button
                    type="button"
                    className="account-info-edit-button"
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
            className="account-info-save-button"
            onClick={() => {
              onSave({
                nickname: draftNickname,
                password: draftPassword,
                phoneNumber: draftPhoneNumber,
                ageGroupOrBirthday: draftAgeGroupOrBirthday,
              })
              setEditing({
                nickname: false,
                password: false,
                phoneNumber: false,
                ageGroupOrBirthday: false,
              })
            }}
          >
            Save
          </button>
        ) : null}
      </section>
    </main>
  )
}

export default AccountInfoPage
