"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface BlackjackEngineProps {
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

export function BlackjackEngine({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: BlackjackEngineProps) {
  const [currentHand, setCurrentHand] = useState<{
    player1Cards: PlayingCard[]
    player2Cards: PlayingCard[]
    player1Score: number
    player2Score: number
    winner: string | null
  } | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const createDeck = (): PlayingCard[] => {
    const suits: PlayingCard["suit"][] = ["♠", "♥", "♦", "♣"]
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    const deck: PlayingCard[] = []

    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        let value = Number.parseInt(rank)
        if (rank === "A") value = 11
        else if (["J", "Q", "K"].includes(rank)) value = 10

        deck.push({
          suit,
          rank,
          value,
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

  const calculateScore = (cards: PlayingCard[]): number => {
    let score = cards.reduce((sum, card) => sum + card.value, 0)
    let aces = cards.filter((card) => card.rank === "A").length

    while (score > 21 && aces > 0) {
      score -= 10
      aces--
    }

    return score
  }

  const playHand = (gameIndex: number) => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck, `${masterSeed}-blackjack-${gameIndex}`)

    const player1Cards = [shuffled[0], shuffled[2]]
    const player2Cards = [shuffled[1], shuffled[3]]
    let deckIndex = 4

    // Player 1 hits until 17 or bust
    while (calculateScore(player1Cards) < 17 && calculateScore(player1Cards) <= 21) {
      player1Cards.push(shuffled[deckIndex++])
    }

    // Player 2 hits until 17 or bust
    while (calculateScore(player2Cards) < 17 && calculateScore(player2Cards) <= 21) {
      player2Cards.push(shuffled[deckIndex++])
    }

    const player1Score = calculateScore(player1Cards)
    const player2Score = calculateScore(player2Cards)

    let winner: string
    if (player1Score > 21 && player2Score > 21) {
      winner = "Tie"
    } else if (player1Score > 21) {
      winner = player2
    } else if (player2Score > 21) {
      winner = player1
    } else if (player1Score > player2Score) {
      winner = player1
    } else if (player2Score > player1Score) {
      winner = player2
    } else {
      winner = "Tie"
    }

    return {
      player1Cards,
      player2Cards,
      player1Score,
      player2Score,
      winner,
      gameId: `blackjack-${gameIndex}`,
      seed: `${masterSeed}-blackjack-${gameIndex}`,
    }
  }

  useEffect(() => {
    if (!session.isRunning || session.completed >= session.count) return

    const interval = setInterval(() => {
      setIsAnimating(true)

      const result = playHand(session.completed)
      setCurrentHand(result)

      onStreamOperation({
        type: "BLACKJACK_HAND",
        timestamp: Date.now(),
        gameId: result.gameId,
        seed: result.seed,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        winner: result.winner,
        cards: {
          [player1]: result.player1Cards,
          [player2]: result.player2Cards,
        },
      })

      setTimeout(() => {
        onUpdate(session.id, session.completed + 1, result)
        setIsAnimating(false)
      }, 800)
    }, 1200)

    return () => clearInterval(interval)
  }, [session, masterSeed, player1, player2, onUpdate, onStreamOperation])

  const renderCard = (card: PlayingCard, index: number) => (
    <div
      key={`${card.suit}-${card.rank}`}
      className={`
        w-12 h-16 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center
        text-xs font-bold shadow-md transform transition-all duration-300
        ${isAnimating ? "scale-110 rotate-2" : "scale-100 rotate-0"}
        ${card.color === "red" ? "text-red-500" : "text-black"}
      `}
      style={{ marginLeft: index > 0 ? "-8px" : "0" }}
    >
      <div>{card.rank}</div>
      <div className="text-lg">{card.suit}</div>
    </div>
  )

  return (
    <div className="space-y-4">
      {currentHand && (
        <div className="space-y-3">
          {/* Player 1 Hand */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{player1}</span>
              <Badge variant={currentHand.player1Score > 21 ? "destructive" : "secondary"}>
                {currentHand.player1Score}
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
              <Badge variant={currentHand.player2Score > 21 ? "destructive" : "secondary"}>
                {currentHand.player2Score}
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
                {currentHand.winner === "Tie" ? "Push!" : `${currentHand.winner} Wins!`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Hands Played</span>
          <span>
            {session.completed}/{session.count}
          </span>
        </div>
        <Progress value={(session.completed / session.count) * 100} className="h-2" />
      </div>
    </div>
  )
}
