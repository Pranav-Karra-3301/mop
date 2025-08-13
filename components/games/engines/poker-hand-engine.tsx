"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface PokerHandEngineProps {
  session: any
  player1: string
  player2: string
  masterSeed: string
  onUpdate: (sessionId: string, completed: number, result?: any) => void
  onStreamOperation: (operation: any) => void
}

interface PlayingCard {
  suit: "♠" | "♥" | "♦" | "♣"
  rank: string
  value: number
  color: "red" | "black"
}

type HandRank =
  | "High Card"
  | "Pair"
  | "Two Pair"
  | "Three of a Kind"
  | "Straight"
  | "Flush"
  | "Full House"
  | "Four of a Kind"
  | "Straight Flush"
  | "Royal Flush"

export function PokerHandEngine({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: PokerHandEngineProps) {
  const [currentHand, setCurrentHand] = useState<{
    player1Cards: PlayingCard[]
    player2Cards: PlayingCard[]
    player1Hand: HandRank
    player2Hand: HandRank
    winner: string | null
  } | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const createDeck = (): PlayingCard[] => {
    const suits: PlayingCard["suit"][] = ["♠", "♥", "♦", "♣"]
    const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
    const deck: PlayingCard[] = []

    suits.forEach((suit) => {
      ranks.forEach((rank, index) => {
        deck.push({
          suit,
          rank,
          value: index + 2,
          color: suit === "♥" || suit === "♦" ? "red" : "black",
        })
      })
    })

    return deck
  }

  const shuffleDeck = (deck: PlayingCard[], seed: string): PlayingCard[] => {
    const shuffled = [...deck]
    let seedNum = 0
    for (let i = 0; i < seed.length; i++) {
      seedNum += seed.charCodeAt(i)
    }

    for (let i = shuffled.length - 1; i > 0; i--) {
      seedNum = (seedNum * 9301 + 49297) % 233280
      const j = seedNum % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  }

  const evaluateHand = (cards: PlayingCard[]): { rank: HandRank; score: number } => {
    const sorted = [...cards].sort((a, b) => a.value - b.value)
    const suits = cards.map((c) => c.suit)
    const values = cards.map((c) => c.value)

    const isFlush = suits.every((suit) => suit === suits[0])
    const isStraight = values.every((val, i) => i === 0 || val === values[i - 1] + 1)

    const valueCounts = values.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    const counts = Object.values(valueCounts).sort((a, b) => b - a)
    const maxValue = Math.max(...values)

    if (isFlush && isStraight && values[0] === 10) {
      return { rank: "Royal Flush", score: 1000 + maxValue }
    }
    if (isFlush && isStraight) {
      return { rank: "Straight Flush", score: 900 + maxValue }
    }
    if (counts[0] === 4) {
      return { rank: "Four of a Kind", score: 800 + maxValue }
    }
    if (counts[0] === 3 && counts[1] === 2) {
      return { rank: "Full House", score: 700 + maxValue }
    }
    if (isFlush) {
      return { rank: "Flush", score: 600 + maxValue }
    }
    if (isStraight) {
      return { rank: "Straight", score: 500 + maxValue }
    }
    if (counts[0] === 3) {
      return { rank: "Three of a Kind", score: 400 + maxValue }
    }
    if (counts[0] === 2 && counts[1] === 2) {
      return { rank: "Two Pair", score: 300 + maxValue }
    }
    if (counts[0] === 2) {
      return { rank: "Pair", score: 200 + maxValue }
    }

    return { rank: "High Card", score: 100 + maxValue }
  }

  const playHand = (gameIndex: number) => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck, `${masterSeed}-poker-${gameIndex}`)

    const player1Cards = shuffled.slice(0, 5)
    const player2Cards = shuffled.slice(5, 10)

    const player1Eval = evaluateHand(player1Cards)
    const player2Eval = evaluateHand(player2Cards)

    let winner: string
    if (player1Eval.score > player2Eval.score) {
      winner = player1
    } else if (player2Eval.score > player1Eval.score) {
      winner = player2
    } else {
      winner = "Tie"
    }

    return {
      player1Cards,
      player2Cards,
      player1Hand: player1Eval.rank,
      player2Hand: player2Eval.rank,
      winner,
      gameId: `poker-${gameIndex}`,
      seed: `${masterSeed}-poker-${gameIndex}`,
    }
  }

  useEffect(() => {
    if (!session.isRunning || session.completed >= session.count) return

    const interval = setInterval(() => {
      setIsAnimating(true)

      const result = playHand(session.completed)
      setCurrentHand(result)

      onStreamOperation({
        type: "POKER_HAND",
        timestamp: Date.now(),
        gameId: result.gameId,
        seed: result.seed,
        player1Hand: result.player1Hand,
        player2Hand: result.player2Hand,
        winner: result.winner,
        cards: {
          [player1]: result.player1Cards,
          [player2]: result.player2Cards,
        },
      })

      setTimeout(() => {
        onUpdate(session.id, session.completed + 1, result)
        setIsAnimating(false)
      }, 1000)
    }, 1500)

    return () => clearInterval(interval)
  }, [session, masterSeed, player1, player2, onUpdate, onStreamOperation])

  const renderCard = (card: PlayingCard, index: number) => (
    <div
      key={`${card.suit}-${card.rank}`}
      className={`
        w-10 h-14 bg-white border-2 border-gray-300 rounded-md flex flex-col items-center justify-center
        text-xs font-bold shadow-md transform transition-all duration-500
        ${isAnimating ? "scale-105 rotate-1" : "scale-100 rotate-0"}
        ${card.color === "red" ? "text-red-500" : "text-black"}
      `}
      style={{ marginLeft: index > 0 ? "-6px" : "0" }}
    >
      <div className="text-xs">{card.rank}</div>
      <div className="text-sm">{card.suit}</div>
    </div>
  )

  const getHandColor = (hand: HandRank) => {
    return "text-foreground" // All hands use standard text color
  }

  return (
    <div className="space-y-4">
      {currentHand && (
        <div className="space-y-3">
          {/* Player 1 Hand */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{player1}</span>
              <Badge variant="outline" className={getHandColor(currentHand.player1Hand)}>
                {currentHand.player1Hand}
              </Badge>
            </div>
            <div className="flex items-center">
              {currentHand.player1Cards.map((card, index) => renderCard(card, index))}
            </div>
          </div>

          {/* Player 2 Hand */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{player2}</span>
              <Badge variant="outline" className={getHandColor(currentHand.player2Hand)}>
                {currentHand.player2Hand}
              </Badge>
            </div>
            <div className="flex items-center">
              {currentHand.player2Cards.map((card, index) => renderCard(card, index))}
            </div>
          </div>

          {/* Winner */}
          {currentHand.winner && (
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-sm font-semibold">
                {currentHand.winner === "Tie" ? "Tie!" : `${currentHand.winner} Wins!`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Hands Dealt</span>
          <span>
            {session.completed}/{session.count}
          </span>
        </div>
        <Progress value={(session.completed / session.count) * 100} className="h-2" />
      </div>
    </div>
  )
}
