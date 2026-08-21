import { useMutation } from '@tanstack/react-query'
import {
  LearningApiError,
  updateLessonPreferences,
} from '../services/learning.service.ts'
import type {
  LessonSectionType,
  UpdateLessonPreferencesData,
} from '../types/lessons.types.ts'

interface UpdateLessonPreferencesVariables {
  lessonId: number
  selectedTypes: LessonSectionType[]
}

export function useUpdateLessonPreferences() {
  return useMutation<
    UpdateLessonPreferencesData | null,
    LearningApiError,
    UpdateLessonPreferencesVariables
  >({
    mutationFn: ({ lessonId, selectedTypes }) =>
      updateLessonPreferences(lessonId, selectedTypes),
  })
}
