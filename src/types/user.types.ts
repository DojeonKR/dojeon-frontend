export interface ApiResponse<T> {
  isSuccess: boolean
  code: string
  message: string
  data: T | null
  errorCode?: string
  timestamp: string
}

export interface UserProfile {
  userId: string
  email: string
  hasPassword?: boolean
  nickname: string | null
  username: string | null
  phoneNumber: string | null
  birthday: string | null
  profileImgUrl: string | null
  motherLanguage: string | null
  proficiencyLevel: string | null
  ageGroup: string | null
  dailyGoalMin: number | null
  learningGoal: string | null
  subscriptionTier: string
  subscriptionPlanId: string | null
  subscriptionExpiresAt: string | null
  isPushNotificationOn: boolean
  isMarketingAgreed: boolean
  isOnboarded?: boolean
  createdAt: string
}

export interface UserStats {
  totalStudyMin: number
  currentStreak: number
  bestStreak: number
  totalCompletedLessons: number
}

export interface UserAttendance {
  year: number
  month: number
  activeDays: number[]
}

export interface UserRecentCourse {
  courseId: number
  courseTitle: string
  lessonId: number
  lessonTitle: string
  sectionId: number
  sectionTitle: string
  sectionType: string
  grammarPreview?: string | null
  overallProgressPercent: number
}

export interface UserAchievement {
  badgeId: number
  title: string
  description?: string
  imageUrl: string | null
  isEarned?: boolean
  earnedAt: string | null
}

export interface UserMeData {
  profile: UserProfile
  stats: UserStats | null
  attendance: UserAttendance | null
  recentCourse: UserRecentCourse | null
  recentAchievements: UserAchievement[] | null
}

export interface UserMeResponse {
  isSuccess: boolean
  code: string
  message: string
  data: UserMeData | null
  errorCode?: string
  timestamp: string
}

export interface UserAchievementsData {
  totalEarned: number
  badges: UserAchievement[]
}

export interface PatchUserRequest {
  nickname?: string
  username?: string
  phoneNumber?: string
  birthday?: string
  motherLanguage?: string
  proficiencyLevel?: string
  ageGroup?: string
  dailyGoalMin?: number
  learningGoal?: string
  isPushNotificationOn?: boolean
  isMarketingAgreed?: boolean
  deviceToken?: string
  profileImgUrl?: string
  isOnboarded?: boolean
}

export interface PatchUserData {
  updated: boolean
}

export interface PatchUserResponse {
  isSuccess: boolean
  code: string
  message: string
  data: PatchUserData | null
  errorCode?: string
  timestamp: string
}

export type ChangePasswordPayload =
  | { currentPassword: string; newPassword: string }
  | { googleIdToken: string; newPassword: string }

export interface ChangePasswordData {
  updated: boolean
}

export type DeleteUserMePayload =
  | { currentPassword: string }
  | { googleIdToken: string }

export interface DeleteUserMeData {
  deleted: boolean
}

export interface PresignedProfileImagePayload {
  contentType: string
  fileExtension: 'jpg' | 'jpeg' | 'png' | 'webp'
  fileSizeBytes: number
}

export interface PresignedProfileImageResult {
  uploadUrl: string
  key: string
  fileUrl: string
}
