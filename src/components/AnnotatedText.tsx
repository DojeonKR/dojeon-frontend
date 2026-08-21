import './AnnotatedText.css'
import {
  isUnitMarkable,
  pickUnitAnnotations,
  segmentAnnotatedText,
} from '../data/annotationText.ts'
import type { AnnotationUnit, MarkMode, SectionAnnotation } from '../types/annotation.types.ts'

interface AnnotatedTextProps {
  text: string
  // findAnnotationUnit 으로 찾은 unit. null 이면(매칭 실패 포함) 일반 텍스트로 그린다.
  unit: AnnotationUnit | null
  markMode: MarkMode
  className?: string
  // 클릭한 구간을 덮는 annotation 목록(겹침 허용)을 그대로 넘긴다.
  onAnnotationPress: (annotations: SectionAnnotation[]) => void
}

// MARK VOCAB / MARK GRAMMAR 가 켜졌을 때 unit 의 annotation 범위에 밑줄을 치고
// 클릭하면 explanation 팝업을 열 수 있게 하는 텍스트 렌더러.
// markMode 가 null 이면 어떤 annotation 도 표시하지 않는다.
function AnnotatedText({ text, unit, markMode, className, onAnnotationPress }: AnnotatedTextProps) {
  if (markMode === null || !isUnitMarkable(unit)) {
    return <span className={className}>{text}</span>
  }

  const annotations = pickUnitAnnotations(unit, markMode)
  if (annotations.length === 0) {
    return <span className={className}>{text}</span>
  }

  const segments = segmentAnnotatedText(text, annotations)
  const markClass =
    markMode === 'VOCAB' ? 'annotated-text-mark-vocab' : 'annotated-text-mark-grammar'

  return (
    <span className={className}>
      {segments.map((segment) => {
        if (segment.annotations.length === 0) {
          return <span key={`${segment.start}-${segment.end}`}>{segment.text}</span>
        }

        return (
          <button
            key={`${segment.start}-${segment.end}`}
            type="button"
            className={`annotated-text-mark ${markClass}`}
            onClick={() => onAnnotationPress(segment.annotations)}
          >
            {segment.text}
          </button>
        )
      })}
    </span>
  )
}

export default AnnotatedText
