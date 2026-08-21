export interface AgeRangeOption {
  id: string
  label: string
}

// 온보딩과 Account Info에서 공통으로 사용하는 나이 범위 선택지.
export const AGE_RANGE_OPTIONS: AgeRangeOption[] = [
  { id: '0-17', label: '0-17' },
  { id: '18-24', label: '18-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-44', label: '35-44' },
  { id: '45-54', label: '45-54' },
  { id: '55-64', label: '55-64' },
  { id: '65-', label: '65 -' },
]

export const isValidAgeRange = (value: string): boolean =>
  AGE_RANGE_OPTIONS.some((option) => option.id === value)
