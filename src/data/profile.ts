export interface ProfileUser {
  userId: number
  email: string
  username: string
  nickname: string
  phoneNumber: string | null
  birthday: string | null
  profileImgUrl: string | null
  joinedYear: number
  subscriptionTier: string
  subscriptionPlanId: string | null
  subscriptionExpiresAt: string | null
}

export interface ProfileSettings {
  motherLanguage: string | null
  proficiencyLevel: string | null
  dailyGoalMin: number | null
  learningGoal: string | null
  isPushNotificationOn: boolean
  isMarketingAgreed: boolean
}

export interface ProfileRecentCourse {
  courseId: number
  lessonId: number
  sectionId: number
  courseTitle: string
  lessonTitle: string
  sectionSubtitle: string
}

export interface ProfileStats {
  totalCompletedLessons: number
  totalStudyMin: number
  currentStreak: number
  bestStreak: number
}

export interface ProfileAttendance {
  year: number
  month: number
  activeDays: number[]
}

export interface ProfileAchievement {
  badgeId: number
  title: string
  imageUrl: string | null
  earnedAt: string | null
}

export interface ProfileMainData {
  user: ProfileUser
  settings: ProfileSettings
  recentCourse: ProfileRecentCourse | null
  stats: ProfileStats
  attendance: ProfileAttendance
  recentAchievements: ProfileAchievement[]
}

export const profileMainMockData: ProfileMainData = {
  user: {
    userId: 100,
    email: 'example@email.com',
    username: 'username',
    nickname: 'nickname',
    phoneNumber: '010-0000-0000',
    birthday: '2000-03-10',
    profileImgUrl: null,
    joinedYear: 2026,
    subscriptionTier: 'FREE',
    subscriptionPlanId: null,
    subscriptionExpiresAt: null,
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

export const formatAchievementDate = (date: string | null) => {
  if (!date) {
    return 'Not earned yet'
  }

  const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parsedDate = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
