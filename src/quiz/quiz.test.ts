import { describe, expect, it } from 'vitest'
import { decodeBase64, decodeQuestion } from './decode'
import { accuracy, compareResults, isBetter, isRanked, percent, verdict } from './scoring'
import { clampAmount, describeSettings, normalizeSettings, parseSettings, questionQuery, shortCategory } from './settings'
import { arrangeOptions, shuffled } from './shuffle'

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))

describe('decode', () => {
  it('decodes UTF-8 through base64', () => {
    expect(decodeBase64(b64('Pokémon’s “café”'))).toBe('Pokémon’s “café”')
  })

  it('decodes a whole question and normalises its fields', () => {
    const q = decodeQuestion({
      type: b64('boolean'),
      difficulty: b64('weird'),
      category: b64('Science: Computers'),
      question: b64('Is 2 > 1?'),
      correct_answer: b64('True'),
      incorrect_answers: [b64('False')],
    })
    expect(q).toEqual({
      type: 'boolean',
      difficulty: 'medium',
      category: 'Science: Computers',
      question: 'Is 2 > 1?',
      correct: 'True',
      incorrect: ['False'],
    })
  })
})

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const items = [1, 2, 3, 4, 5]
    const out = shuffled(items, () => 0.3)
    expect(out.slice().sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5])
  })

  it('points correctIndex at the right answer', () => {
    for (const r of [0, 0.25, 0.5, 0.99]) {
      const { options, correctIndex } = arrangeOptions('Paris', ['Rome', 'Oslo', 'Bern'], 'multiple', () => r)
      expect(options[correctIndex]).toBe('Paris')
      expect(options).toHaveLength(4)
    }
  })

  it('keeps True before False', () => {
    expect(arrangeOptions('False', ['True'], 'boolean', () => 0)).toEqual({ options: ['True', 'False'], correctIndex: 1 })
  })
})

describe('settings', () => {
  it('clamps the amount to what OpenTDB serves', () => {
    expect(clampAmount(0)).toBe(1)
    expect(clampAmount(99)).toBe(50)
    expect(clampAmount('12')).toBe(12)
    expect(clampAmount('nope')).toBe(10)
  })

  it('normalises anything into valid settings', () => {
    expect(normalizeSettings({ category: '9', difficulty: 'hard', type: 'x', amount: 5 })).toEqual({
      category: 9,
      difficulty: 'hard',
      type: null,
      amount: 5,
    })
    expect(parseSettings('{not json')).toEqual({ category: null, difficulty: null, type: null, amount: 10 })
  })

  it('builds the OpenTDB query', () => {
    const q = new URLSearchParams(questionQuery({ category: 9, difficulty: null, type: 'boolean', amount: 20 }))
    expect(Object.fromEntries(q)).toEqual({ amount: '20', category: '9', type: 'boolean', encode: 'base64' })
  })

  it('reads well', () => {
    expect(shortCategory('Entertainment: Japanese Anime & Manga')).toBe('Anime & Manga')
    expect(describeSettings({ category: null, difficulty: 'easy', type: null, amount: 1 })).toBe('1 question · Any category · Easy')
  })
})

describe('scoring', () => {
  it('ranks by accuracy, then by the longer set', () => {
    expect(compareResults({ correct: 20, total: 20 }, { correct: 10, total: 10 })).toBeLessThan(0)
    expect(compareResults({ correct: 9, total: 10 }, { correct: 10, total: 10 })).toBeGreaterThan(0)
    expect(isBetter({ correct: 5, total: 10 }, null)).toBe(true)
    expect(isBetter({ correct: 5, total: 10 }, { correct: 6, total: 10 })).toBe(false)
  })

  it('only ranks sets of ten or more', () => {
    expect(isRanked(9)).toBe(false)
    expect(isRanked(10)).toBe(true)
  })

  it('computes shares and verdicts', () => {
    expect(accuracy(3, 0)).toBe(0)
    expect(percent(2, 3)).toBe(67)
    expect(verdict(10, 10)).toMatch(/perfect/i)
    expect(verdict(0, 10)).toMatch(/none/i)
  })
})
