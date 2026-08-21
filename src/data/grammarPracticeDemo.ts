import type { ContentLanguage } from './contentLanguage.ts'
import type {
  DemoScriptLine,
  NextGrammarExampleMessage,
  NextGrammarNoteId,
  NextGrammarVocabId,
  PracticeQuestionModel,
} from '../types/grammarPractice.types.ts'

/**
 * 문법 연습 화면의 디자인 시안용 하드코딩 콘텐츠.
 *
 * 운영 빌드에는 절대 노출되면 안 되는 값이라 `import.meta.env.DEV` 로만 노출한다.
 * Vite 가 프로덕션 빌드에서 `import.meta.env.DEV` 를 `false` 로 치환하므로
 * 아래 객체 전체가 번들에서 제거되고, 화면은 `grammarPracticeDemo === null` 분기로
 * 빈 상태/오류 안내를 그린다.
 */

export interface GrammarPracticeDemo {
  /** 자료 title 이 없을 때 헤더에 쓰던 임시 제목 */
  sectionTitle: string
  choice: {
    prompt: string
    options: string[]
    correctAnswer: string
  }
  fillCorrectAnswer: string
  makeCorrectAnswer: string
  sentenceTokens: string[]
  readingQuestions: PracticeQuestionModel[]
  listeningQuestions: PracticeQuestionModel[]
  readingScript: DemoScriptLine[]
  listeningScript: DemoScriptLine[]
  grammarGridItems: string[]
  grammarNotes: Record<NextGrammarNoteId, { title: string; description: string }>
  vocabNotes: Record<NextGrammarVocabId, { title: string; description: string }>
  explanationLines: (language: ContentLanguage) => string[]
  nextGrammarExamples: (language: ContentLanguage) => NextGrammarExampleMessage[]
}

const demo: GrammarPracticeDemo = {
  sectionTitle: '을까요? 1)',
  choice: {
    prompt: '준호씨가 커피를',
    options: ['마시다', '먹다', '보다', '가다'],
    correctAnswer: '마시다',
  },
  fillCorrectAnswer: '마시다',
  makeCorrectAnswer: '준호씨가 커피를 마신다.',
  sentenceTokens: ['준호', '커피', '마시다'],
  readingQuestions: [
    {
      questionId: -1,
      title: 'Question 1',
      prompt: '두 사람은 며칠에 만났어요?',
      type: 'choice',
      options: ['월요일', '수요일', '토요일', '일요일'],
      answer: '토요일',
    },
    {
      questionId: -2,
      title: 'Question 2',
      prompt: '마리 씨는 왜 오늘 영화를 못 봐요?',
      type: 'blank',
      options: [],
      answer: null,
    },
  ],
  listeningQuestions: [
    {
      questionId: -11,
      title: 'Question 1',
      prompt: '두 사람은 몇시에 만나요?',
      type: 'choice',
      options: ['2:00', '2:30', '3:00', '3:30'],
      answer: '2:00',
    },
  ],
  readingScript: [
    { speaker: '건우', text: '마리 씨, 오늘 같이 영화를 볼까요?' },
    { speaker: '마리', text: '미안해요. 오늘은 회의가 있어요.' },
    { text: '그래서 바빠요.', indented: true },
    { speaker: '건우', text: '언제 시간이 있어요?' },
    { speaker: '마리', text: '저는 토요일이나 일요일이 좋아요.' },
    { speaker: '건우', text: '그럼 토요일에 만날까요?' },
    { speaker: '마리', text: '네, 좋아요. 토요일에 만나요.' },
  ],
  listeningScript: [
    { speaker: '남자', text: '토요일 몇 시에 만날까요?' },
    { speaker: '여자', text: '2시나 3시에 만나요.' },
    { speaker: '남자', text: '그럼 2시에 만나요.' },
    { text: '그런데 어디에서 만날까요?', indented: true },
    { speaker: '여자', text: '백화점 앞에서 만날까요?' },
    { speaker: '남자', text: '백화점 앞에는 사람이 많아요.' },
    { text: '2시에 서점 앞에서 만나요.', indented: true },
    { speaker: '여자', text: '네, 알았어요.' },
  ],
  grammarGridItems: ['', 'V -ㄹ까요?', '가다', '갈까요?', '', 'V-을까요?', '먹다', '먹을까요?'],
  grammarNotes: {
    'future-proposal': {
      title: '-(으)ㄹ까요?',
      description:
        '-(으)ㄹ까요? is used to suggest doing something together or to ask someone’s opinion in a polite way. Use -ㄹ까요? after a vowel or ㄹ, and -을까요? after other final consonants.',
    },
    'polite-ending': {
      title: '-아/어/해요',
      description:
        '아요/어요/해요 is a polite informal sentence ending used in everyday conversations with people you’re not very close to, but in casual settings. Use -아요 after ㅏ/ㅗ vowels, -어요 after other vowels, and -해요 with 하다 verbs.',
    },
  },
  vocabNotes: {
    yes: { title: '네', description: 'yes' },
    together: { title: '같이', description: 'together' },
    lunch: { title: '점심', description: 'lunch' },
    eat: { title: '먹다', description: 'to eat' },
  },
  explanationLines: (language) =>
    language === 'he'
      ? [
          'הזמנה לפעולה.',
          '"שנעשה (משהו)?"',
          'זו צורת דיבור בלבד בפנייה לאדם כלשהו, עם',
          'כוונה להציע לעשות משהו יחד.',
        ]
      : [
          'A suggestion to do something.',
          '"Shall we (do something)?"',
          'This spoken form is used when you address someone',
          'to suggest doing something together.',
        ],
  nextGrammarExamples: (language) => [
    {
      id: 'proposal',
      side: 'left',
      translation: language === 'he' ? 'האם נאכל יחד צהריים?' : 'Shall we eat lunch together?',
      tokens: [
        { text: '같이', vocabId: 'together' },
        { text: ' ', emphasis: 'medium' },
        { text: '점심', vocabId: 'lunch' },
        { text: '을 ', emphasis: 'medium' },
        { text: '먹을까요?', grammarId: 'future-proposal', vocabId: 'eat', emphasis: 'semibold' },
      ],
    },
    {
      id: 'reply',
      side: 'right',
      translation: language === 'he' ? 'כן, בוא/י נאכל יחד.' : 'Yes, let’s eat together.',
      tokens: [
        { text: '네', vocabId: 'yes' },
        { text: ', ', emphasis: 'medium' },
        { text: '같이', vocabId: 'together' },
        { text: ' ', emphasis: 'medium' },
        { text: '먹어요.', grammarId: 'polite-ending', vocabId: 'eat' },
      ],
    },
  ],
}

/** 운영 빌드에서는 항상 null. 데모 콘텐츠는 개발 서버에서만 쓴다. */
export const grammarPracticeDemo: GrammarPracticeDemo | null = import.meta.env.DEV ? demo : null
