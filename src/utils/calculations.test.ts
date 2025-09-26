import { describe, it, expect } from 'vitest'
import {
  calculateWinRate,
  calculateGamesWinRate,
  updatePlayerStats,
  rankPlayers,
  formatStreak
} from './calculations'
import { Player } from '../types'

describe('calculateWinRate', () => {
  it('calculates win rate correctly', () => {
    expect(calculateWinRate(5, 10)).toBe(50)
    expect(calculateWinRate(3, 7)).toBe(43)
    expect(calculateWinRate(0, 5)).toBe(0)
  })

  it('returns 0 when no matches played', () => {
    expect(calculateWinRate(0, 0)).toBe(0)
  })
})

describe('calculateGamesWinRate', () => {
  it('calculates games win rate correctly', () => {
    expect(calculateGamesWinRate(15, 30)).toBe(50)
    expect(calculateGamesWinRate(12, 28)).toBe(43)
  })

  it('returns 0 when no games played', () => {
    expect(calculateGamesWinRate(0, 0)).toBe(0)
  })
})

describe('updatePlayerStats', () => {
  const mockPlayer: Player = {
    id: '1',
    name: 'Test Player',
    skill: 50,
    isGuest: false,
    availability: [],
    createdAt: '2024-01-01',
    stats: {
      matchesPlayed: 5,
      matchesWon: 3,
      matchesLost: 2,
      gamesWon: 15,
      gamesLost: 12,
      points: 35,
      lastPlayed: '2024-01-01',
      currentStreak: 1
    }
  }

  it('updates stats correctly for a win', () => {
    const result = updatePlayerStats(mockPlayer, 4, 2, true, '2024-01-02')

    expect(result.stats.matchesPlayed).toBe(6)
    expect(result.stats.matchesWon).toBe(4)
    expect(result.stats.matchesLost).toBe(2)
    expect(result.stats.gamesWon).toBe(19)
    expect(result.stats.gamesLost).toBe(14)
    expect(result.stats.points).toBe(38) // 35 + 3
    expect(result.stats.currentStreak).toBe(2)
    expect(result.stats.lastPlayed).toBe('2024-01-02')
  })

  it('updates stats correctly for a loss', () => {
    const result = updatePlayerStats(mockPlayer, 2, 4, false, '2024-01-02')

    expect(result.stats.matchesPlayed).toBe(6)
    expect(result.stats.matchesWon).toBe(3)
    expect(result.stats.matchesLost).toBe(3)
    expect(result.stats.gamesWon).toBe(17)
    expect(result.stats.gamesLost).toBe(16)
    expect(result.stats.points).toBe(35) // 35 + 0
    expect(result.stats.currentStreak).toBe(-1)
  })

  it('updates stats correctly for a tie', () => {
    const result = updatePlayerStats(mockPlayer, 3, 3, false, '2024-01-02', true)

    expect(result.stats.matchesPlayed).toBe(6)
    expect(result.stats.matchesWon).toBe(3) // No additional win
    expect(result.stats.matchesLost).toBe(2) // No additional loss
    expect(result.stats.gamesWon).toBe(18)
    expect(result.stats.gamesLost).toBe(15)
    expect(result.stats.points).toBe(36) // 35 + 1
    expect(result.stats.currentStreak).toBe(1) // Streak unchanged
  })

  it('handles streak changes correctly', () => {
    const losingPlayer = { ...mockPlayer, stats: { ...mockPlayer.stats, currentStreak: -2 } }
    const result = updatePlayerStats(losingPlayer, 4, 1, true, '2024-01-02')

    expect(result.stats.currentStreak).toBe(1) // Reset to 1 after win
  })
})

describe('rankPlayers', () => {
  const players: Player[] = [
    {
      id: '1',
      name: 'Alice',
      skill: 60,
      isGuest: false,
      availability: [],
      createdAt: '2024-01-01',
      stats: { matchesPlayed: 10, matchesWon: 8, matchesLost: 2, gamesWon: 25, gamesLost: 15, points: 80, lastPlayed: '', currentStreak: 3 }
    },
    {
      id: '2',
      name: 'Bob',
      skill: 55,
      isGuest: false,
      availability: [],
      createdAt: '2024-01-01',
      stats: { matchesPlayed: 10, matchesWon: 6, matchesLost: 4, gamesWon: 22, gamesLost: 18, points: 60, lastPlayed: '', currentStreak: 1 }
    },
    {
      id: '3',
      name: 'Charlie',
      skill: 58,
      isGuest: false,
      availability: [],
      createdAt: '2024-01-01',
      stats: { matchesPlayed: 10, matchesWon: 7, matchesLost: 3, gamesWon: 24, gamesLost: 16, points: 70, lastPlayed: '', currentStreak: 2 }
    }
  ]

  it('ranks players by points (descending)', () => {
    const ranked = rankPlayers(players)

    expect(ranked[0].name).toBe('Alice') // 80 points
    expect(ranked[1].name).toBe('Charlie') // 70 points
    expect(ranked[2].name).toBe('Bob') // 60 points
  })

  it('returns a new array without modifying original', () => {
    const originalOrder = players.map(p => p.name)
    const ranked = rankPlayers(players)
    const rankedOrder = ranked.map(p => p.name)

    expect(originalOrder).not.toEqual(rankedOrder)
    expect(originalOrder).toEqual(['Alice', 'Bob', 'Charlie'])
  })
})

describe('formatStreak', () => {
  it('formats winning streaks correctly', () => {
    expect(formatStreak(5)).toBe('5W')
    expect(formatStreak(1)).toBe('1W')
  })

  it('formats losing streaks correctly', () => {
    expect(formatStreak(-3)).toBe('3L')
    expect(formatStreak(-1)).toBe('1L')
  })

  it('handles no streak', () => {
    expect(formatStreak(0)).toBe('No streak')
  })
})
