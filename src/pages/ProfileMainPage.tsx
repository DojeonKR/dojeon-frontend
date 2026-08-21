import { useEffect, useState } from 'react'
import './ProfileMainPage.css'
import homeIcon from '../assets/home.svg'
import classIcon from '../assets/Class.svg'
import editIcon from '../assets/edit.svg'
import fileIcon from '../assets/file.svg'
import bookOpenIcon from '../assets/book-open.svg'
import profileIcon from '../assets/user.svg'
import settingIcon from '../assets/setting_icon.svg'
import starIcon from '../assets/star.svg'
import { defaultProfileImageSrc } from '../data/profileImages.ts'
import { useUserMe } from '../hooks/useUserMe.ts'
import ProfileImageBottomSheet from '../components/ProfileImageBottomSheet'
import type { UserMeData } from '../types/user.types.ts'
import { isUnauthorizedError } from '../services/apiError.ts'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: classIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

interface ProfileUser {
  userId: string
  email: string
  hasPassword: boolean
  username: string
  nickname: string
  phoneNumber: string | null
  birthday: string | null
  profileImgUrl: string | null
  joinedYear: number
  subscriptionTier: string
  subscriptionPlanId: string | null
  subscriptionExpiresAt: string | null
  isOnboarded: boolean
}

interface ProfileSettings {
  motherLanguage: string | null
  proficiencyLevel: string | null
  dailyGoalMin: number | null
  learningGoal: string | null
  isPushNotificationOn: boolean
  isMarketingAgreed: boolean
}

interface ProfileRecentCourse {
  courseId: number
  lessonId: number
  sectionId: number
  courseTitle: string
  lessonTitle: string
  sectionSubtitle: string
}

interface ProfileStats {
  totalCompletedLessons: number
  totalStudyMin: number
  currentStreak: number
  bestStreak: number
}

interface ProfileAttendance {
  year: number
  month: number
  activeDays: number[]
}

interface ProfileAchievement {
  badgeId: number
  title: string
  imageUrl: string | null
  earnedAt: string | null
}

interface ProfileMainData {
  user: ProfileUser
  settings: ProfileSettings
  recentCourse: ProfileRecentCourse | null
  stats: ProfileStats
  attendance: ProfileAttendance
  recentAchievements: ProfileAchievement[]
}

const profileMainMockData: ProfileMainData = {
  user: {
    userId: '100',
    email: 'example@email.com',
    hasPassword: true,
    username: 'username',
    nickname: 'nickname',
    phoneNumber: '010-0000-0000',
    birthday: '2000-03-10',
    profileImgUrl: null,
    joinedYear: 2026,
    subscriptionTier: 'FREE',
    subscriptionPlanId: null,
    subscriptionExpiresAt: null,
    isOnboarded: true,
  },
  settings: {
    motherLanguage: 'EN',
    proficiencyLevel: 'LEVEL_2',
    dailyGoalMin: 15,
    learningGoal: 'HOBBY',
    isPushNotificationOn: true,
    isMarketingAgreed: false,
  },
  recentCourse: {
    courseId: 1,
    lessonId: 105,
    sectionId: 505,
    courseTitle: 'Course 1',
    lessonTitle: 'lesson 5',
    sectionSubtitle: 'Grammar 3 을까요? 1)',
  },
  stats: {
    totalCompletedLessons: 24,
    totalStudyMin: 80,
    currentStreak: 3,
    bestStreak: 7,
  },
  attendance: {
    year: 2026,
    month: 3,
    activeDays: [1, 2, 3],
  },
  recentAchievements: [
    {
      badgeId: 10,
      title: 'Daily streak',
      imageUrl: null,
      earnedAt: '2026-03-28',
    },
    {
      badgeId: 11,
      title: 'Daily streak',
      imageUrl: null,
      earnedAt: '2026-03-28',
    },
  ],
}

const getJoinedYear = (createdAt: string) => {
  const date = new Date(createdAt)
  return Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear()
}

const mapUserMeToProfileData = (data: UserMeData): ProfileMainData => ({
  user: {
    userId: data.profile.userId,
    email: data.profile.email,
    hasPassword: data.profile.hasPassword ?? true,
    username: data.profile.username ?? data.profile.email.split('@')[0],
    nickname: data.profile.nickname ?? data.profile.username ?? 'Dojeon',
    phoneNumber: data.profile.phoneNumber,
    birthday: data.profile.birthday,
    profileImgUrl: data.profile.profileImgUrl,
    joinedYear: getJoinedYear(data.profile.createdAt),
    subscriptionTier: data.profile.subscriptionTier,
    subscriptionPlanId: data.profile.subscriptionPlanId,
    subscriptionExpiresAt: data.profile.subscriptionExpiresAt,
    isOnboarded: data.profile.isOnboarded ?? false,
  },
  settings: {
    motherLanguage: data.profile.motherLanguage,
    proficiencyLevel: data.profile.proficiencyLevel,
    dailyGoalMin: data.profile.dailyGoalMin,
    learningGoal: data.profile.learningGoal,
    isPushNotificationOn: data.profile.isPushNotificationOn,
    isMarketingAgreed: data.profile.isMarketingAgreed,
  },
  recentCourse: data.recentCourse
    ? {
      courseId: data.recentCourse.courseId,
      lessonId: data.recentCourse.lessonId,
      sectionId: data.recentCourse.sectionId,
      courseTitle: data.recentCourse.courseTitle,
      lessonTitle: data.recentCourse.lessonTitle,
      sectionSubtitle: data.recentCourse.grammarPreview ?? data.recentCourse.sectionTitle,
    }
    : null,
  stats: {
    totalCompletedLessons: data.stats?.totalCompletedLessons ?? 0,
    totalStudyMin: data.stats?.totalStudyMin ?? 0,
    currentStreak: data.stats?.currentStreak ?? 0,
    bestStreak: data.stats?.bestStreak ?? 0,
  },
  attendance: {
    year: data.attendance?.year ?? new Date().getFullYear(),
    month: data.attendance?.month ?? new Date().getMonth() + 1,
    activeDays: data.attendance?.activeDays ?? [],
  },
  recentAchievements: (data.recentAchievements ?? []).map((achievement) => ({
    badgeId: achievement.badgeId,
    title: achievement.title,
    imageUrl: achievement.imageUrl,
    earnedAt: achievement.earnedAt,
  })),
})

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const getCalendarDays = (year: number, month: number) => {
  const firstDayIndex = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const leadingEmptyDays = Array.from({ length: firstDayIndex }, () => null)
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => index + 1)
  const calendarDays = [...leadingEmptyDays, ...monthDays]
  const trailingEmptyDays = Array.from(
    { length: (7 - (calendarDays.length % 7)) % 7 },
    () => null,
  )

  return [...calendarDays, ...trailingEmptyDays]
}

interface ProfileMainPageProps {
  preferFallbackContent?: boolean
  nickname: string
  username: string
  onOpenHome: () => void
  onOpenClass: () => void
  onOpenPractice: () => void
  onOpenNotebook: () => void
  onOpenSetting: () => void
  onOpenAchievements: () => void
  onOpenSubscription: () => void
  onUnauthorized: () => void
}

const formatStudyTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

function ProfileMainPage({
  preferFallbackContent = false,
  nickname,
  username,
  onOpenHome,
  onOpenClass,
  onOpenPractice,
  onOpenNotebook,
  onOpenSetting,
  onOpenAchievements,
  onOpenSubscription,
  onUnauthorized,
}: ProfileMainPageProps) {
  const { data: userMeData, loading, error, refetch } = useUserMe()
  const [isProfileImageSheetOpen, setIsProfileImageSheetOpen] = useState(false)
  const isUnauthorized = isUnauthorizedError(error)

  useEffect(() => {
    if (isUnauthorized) onUnauthorized()
  }, [isUnauthorized, onUnauthorized])

  if (isUnauthorized) return null

  if (loading && !preferFallbackContent) {
    return (
      <main className="profile-main-screen">
        <section className="profile-main-status-panel" role="status">
          <p className="profile-main-status-text">Loading profile...</p>
        </section>
      </main>
    )
  }

  if ((error || !userMeData) && !preferFallbackContent) {
    return (
      <main className="profile-main-screen">
        <section className="profile-main-status-panel" role="alert">
          <p className="profile-main-status-text">
            {error?.message ?? 'Unable to load profile.'}
          </p>
          <button
            type="button"
            className="profile-main-status-button"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </section>
      </main>
    )
  }

  const apiProfileData = userMeData ? mapUserMeToProfileData(userMeData) : null
  const profileData = {
    ...(apiProfileData ?? profileMainMockData),
    user: {
      ...(apiProfileData?.user ?? profileMainMockData.user),
      nickname: apiProfileData?.user.nickname ?? (nickname.trim() || profileMainMockData.user.nickname),
      username: apiProfileData?.user.username ?? (username.trim() || profileMainMockData.user.username),
    },
  }
  const { user, recentCourse, stats, attendance, recentAchievements } = profileData
  const calendarDays = getCalendarDays(attendance.year, attendance.month)
  const calendarTitle = `${monthNames[attendance.month - 1]} ${attendance.year}`
  const visibleAchievements = recentAchievements.slice(0, 5)
  const subscriptionPlanLabel =
    user.subscriptionTier === 'FREE' ? 'Free Plan' : `${user.subscriptionTier} Plan`
  const currentProfileImageUrl = user.profileImgUrl || defaultProfileImageSrc

  return (
    <main className="profile-main-screen">
      <section className="profile-main-content">
        <section className="profile-main-hero">
          <button
            type="button"
            className="profile-main-setting-button"
            onClick={onOpenSetting}
            aria-label="Open settings"
          >
            <img src={settingIcon} alt="" aria-hidden="true" />
          </button>

          <div className="profile-main-identity">
            <div className="profile-main-avatar-wrap">
              <button
                type="button"
                className="profile-main-avatar"
                onClick={() => setIsProfileImageSheetOpen(true)}
                aria-label="Edit profile image"
              >
                <img className="profile-main-avatar-image" src={currentProfileImageUrl} alt="" />
              </button>
              <button
                type="button"
                className="profile-main-avatar-edit"
                onClick={() => setIsProfileImageSheetOpen(true)}
                aria-label="Edit profile image"
              >
                <img src={editIcon} alt="" aria-hidden="true" />
              </button>
            </div>
            <div className="profile-main-copy">
              <h1 className="profile-main-greeting">
                안녕하세요!
                <br />
                <span className="profile-main-nickname">[{user.nickname}]</span>님!
              </h1>
              <p className="profile-main-meta">
                @{user.username} <span aria-hidden="true">•</span> joined {user.joinedYear}
              </p>
            </div>
          </div>
        </section>

        <section className="profile-main-section">
          <h2 className="profile-main-section-title">Course</h2>
          <article className="profile-main-card profile-main-last-lesson">
            <p className="profile-main-card-label">Last lesson</p>
            {recentCourse ? (
              <p className="profile-main-last-copy">
                <span className="profile-main-course-chip">
                  {recentCourse.courseTitle.toUpperCase()}
                </span>
                <span className="profile-main-lesson-pill">{recentCourse.lessonTitle}</span>
                <strong>{recentCourse.sectionSubtitle}</strong>
              </p>
            ) : (
              <p className="profile-main-empty-text">No recent lesson yet</p>
            )}
          </article>

          <div className="profile-main-card-grid">
            <article className="profile-main-card profile-main-stat-card">
              <p className="profile-main-card-label">Total lesson</p>
              <strong>{stats.totalCompletedLessons} lessons</strong>
            </article>
            <article className="profile-main-card profile-main-stat-card">
              <p className="profile-main-card-label">Total time studied</p>
              <strong>{formatStudyTime(stats.totalStudyMin)}</strong>
            </article>
          </div>
        </section>

        <section className="profile-main-section">
          <h2 className="profile-main-section-title">Streak</h2>
          <div className="profile-main-card-grid">
            <article className="profile-main-card profile-main-stat-card">
              <p className="profile-main-card-label">Current Streak</p>
              <strong>{stats.currentStreak}-day</strong>
            </article>
            <article className="profile-main-card profile-main-stat-card">
              <p className="profile-main-card-label">Best Streak</p>
              <strong>{stats.bestStreak}-day</strong>
            </article>
          </div>

          <article className="profile-main-calendar">
            <div className="profile-main-calendar-header">
              <h3 className="profile-main-calendar-title">{calendarTitle}</h3>
              <div className="profile-main-calendar-controls">
                <button type="button" aria-label="Previous month">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M15 18L9 12L15 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button type="button" aria-label="Next month">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="profile-main-weekdays" aria-hidden="true">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="profile-main-calendar-grid" aria-label={`${calendarTitle} attendance`}>
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <span key={`empty-${index}`} className="profile-main-calendar-empty" />
                }

                return (
                  <span key={day} className="profile-main-calendar-day">
                    <span
                      className={`profile-main-calendar-mark ${
                        attendance.activeDays.includes(day)
                          ? 'profile-main-calendar-mark-active'
                          : ''
                      }`}
                    >
                      {attendance.activeDays.includes(day) ? (
                        <img src={starIcon} alt="" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span>{day}</span>
                  </span>
                )
              })}
            </div>
          </article>
        </section>

        <section className="profile-main-section">
          <div className="profile-main-section-header">
            <h2 className="profile-main-section-title">Achievements</h2>
            <button
              type="button"
              className="profile-main-section-link"
              onClick={onOpenAchievements}
            >
              see more
            </button>
          </div>
          <div className="profile-main-achievement-row">
            {visibleAchievements.length > 0 ? (
              visibleAchievements.map((achievement) => (
                <article key={achievement.badgeId} className="profile-main-achievement">
                  <div className="profile-main-achievement-medal" aria-hidden="true">
                    {achievement.imageUrl ? (
                      <img
                        className="profile-main-achievement-image"
                        src={achievement.imageUrl}
                        alt=""
                      />
                    ) : null}
                  </div>
                  <p className="profile-main-achievement-title">{achievement.title}</p>
                </article>
              ))
            ) : (
              <article className="profile-main-achievement-empty">
                <p className="profile-main-empty-text">No achievements yet</p>
              </article>
            )}
          </div>
        </section>

        <section className="profile-main-section profile-main-subscription-section">
          <h2 className="profile-main-section-title">Subscriptions</h2>
          <article className="profile-main-subscription-card">
            <p className="profile-main-subscription-placeholder">{subscriptionPlanLabel}</p>
            <button
              type="button"
              className="profile-main-subscribe-button"
              onClick={onOpenSubscription}
            >
              {user.subscriptionTier === 'FREE' ? 'Upgrade' : 'Manage'}
            </button>
          </article>
        </section>
      </section>

      <nav className="profile-main-bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`profile-main-tab ${
              tab.label === 'PROFILE' ? 'profile-main-tab-active' : ''
            }`}
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

              if (tab.label === 'NOTEBOOK') {
                onOpenNotebook()
              }
            }}
          >
            <img className="profile-main-tab-icon" src={tab.icon} alt="" aria-hidden="true" />
            <span className="profile-main-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
      {isProfileImageSheetOpen ? (
        <ProfileImageBottomSheet
          currentImageUrl={user.profileImgUrl}
          onClose={() => setIsProfileImageSheetOpen(false)}
          onUnauthorized={onUnauthorized}
        />
      ) : null}
    </main>
  )
}

export default ProfileMainPage
