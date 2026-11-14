// OpenTDB text arrives base64-encoded (`encode=base64`). `atob` alone yields Latin-1 code units, which mangles
// any UTF-8 (é, ü, ’ …), so the bytes go through TextDecoder.

const decoder = new TextDecoder('utf-8')

export function decodeBase64(b64: string): string {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return decoder.decode(bytes)
}

/** One question as OpenTDB sends it (every field still encoded). */
export interface RawQuestion {
  type: string
  difficulty: string
  category: string
  question: string
  correct_answer: string
  incorrect_answers: string[]
}

export interface DecodedQuestion {
  type: 'multiple' | 'boolean'
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  question: string
  correct: string
  incorrect: string[]
}

export function decodeQuestion(raw: RawQuestion): DecodedQuestion {
  const type = decodeBase64(raw.type)
  const difficulty = decodeBase64(raw.difficulty)
  return {
    type: type === 'boolean' ? 'boolean' : 'multiple',
    difficulty: difficulty === 'easy' || difficulty === 'hard' ? difficulty : 'medium',
    category: decodeBase64(raw.category),
    question: decodeBase64(raw.question),
    correct: decodeBase64(raw.correct_answer),
    incorrect: raw.incorrect_answers.map(decodeBase64),
  }
}
