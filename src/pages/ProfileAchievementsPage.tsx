import { useEffect } from 'react'
import './ProfileAchievementsPage.css'
import { formatAchievementDate } from '../data/profile'
import { useUserAchievements } from '../hooks/useUserAchievements'
import type { UserAchievement } from '../types/user.types'
import { isUnauthorizedError } from '../services/apiError'

interface ProfileAchievementsPageProps {
  onBack: () => void
  onUnauthorized: () => void
}

function AchievementItem({ achievement }: { achievement: UserAchievement }) {
  return (
    <article className="profile-achievements-item">
      <div className="profile-achievements-medal" aria-hidden="true">
        {achievement.imageUrl ? (
          <img className="profile-achievements-image" src={achievement.imageUrl} alt="" />
        ) : null}
      </div>
      <p className="profile-achievements-date">{formatAchievementDate(achievement.earnedAt)}</p>
      <p className="profile-achievements-name">{achievement.title}</p>
    </article>
  )
}

function ProfileAchievementsPage({ onBack, onUnauthorized }: ProfileAchievementsPageProps) {
  const { data: achievementsData, error, isError, isLoading, refetch } = useUserAchievements()
  const achievements = achievementsData?.badges ?? []
  const isUnauthorized = isUnauthorizedError(error)

  useEffect(() => {
    if (isUnauthorized) onUnauthorized()
  }, [isUnauthorized, onUnauthorized])

  if (isUnauthorized) return null

  return (
    <main className="profile-achievements-screen">
      <section className="profile-achievements-content">
        <header className="profile-achievements-header">
          <button
            type="button"
            className="profile-achievements-back"
            onClick={onBack}
            aria-label="뒤로 가기"
          >
            <svg
              className="profile-achievements-back-icon"
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
          <h1 className="profile-achievements-title">Achievements</h1>
        </header>

        {isLoading ? (
          <p className="profile-achievements-status">Loading achievements...</p>
        ) : isError ? (
          <div className="profile-achievements-status" role="status">
            <p>Unable to load achievements.</p>
            <button
              type="button"
              className="profile-achievements-retry"
              onClick={() => {
                void refetch()
              }}
            >
              Retry
            </button>
          </div>
        ) : achievements.length > 0 ? (
          <section className="profile-achievements-grid" aria-label="Achievements">
            {achievements.map((achievement) => (
              <AchievementItem key={achievement.badgeId} achievement={achievement} />
            ))}
          </section>
        ) : (
          <p className="profile-achievements-status">No achievements yet</p>
        )}
      </section>
    </main>
  )
}

export default ProfileAchievementsPage
