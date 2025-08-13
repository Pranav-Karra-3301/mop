"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface DeckShuffleEngineProps {
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

export function DeckShuffleEngine({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: DeckShuffleEngineProps) {
  const [currentShuffle, setCurrentShuffle] = useState<{
    topCard: PlayingCard
    bottomCard: PlayingCard
    middleCard: PlayingCard
    shufflePattern: string
    winner: string | null
  } | null>(null)
  const [isShuffling, setIsShuffling] = useState(false)

  const createDeck = (): PlayingCard[] => {
    const suits: PlayingCard["suit"][] = ["♠", "♥", "♦", "♣"]
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    const deck: PlayingCard[] = []

    suits.forEach((suit) => {
      ranks.forEach((rank, index) => {
        deck.push({
          suit,
          rank,
          value: index + 1,
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

  const performShuffle = (gameIndex: number) => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck, `${masterSeed}-shuffle-${gameIndex}`)

    const topCard = shuffled[0]
    const bottomCard = shuffled[51]
    const middleCard = shuffled[25]

    // Determine winner based on top card value
    const winner = topCard.color === "red" ? player1 : player2

    // Generate shuffle pattern visualization
    const patterns = ["Riffle", "Bridge", "Overhand", "Hindu", "Weave", "Faro"]
    const patternIndex = (topCard.value + bottomCard.value) % patterns.length
    const shufflePattern = patterns[patternIndex]

    return {
      topCard,
      bottomCard,
      middleCard,
      shufflePattern,
      winner,
      gameId: `shuffle-${gameIndex}`,
      seed: `${masterSeed}-shuffle-${gameIndex}`,
      deckOrder: shuffled.map((c) => `${c.rank}${c.suit}`).join(","),
    }
  }

  useEffect(() => {
    if (!session.isRunning || session.completed >= session.count) return

    const interval = setInterval(() => {
      setIsShuffling(true)

      const result = performShuffle(session.completed)
      setCurrentShuffle(result)

      onStreamOperation({
        type: "DECK_SHUFFLE",
        timestamp: Date.now(),
        gameId: result.gameId,
        seed: result.seed,
        shufflePattern: result.shufflePattern,
        topCard: `${result.topCard.rank}${result.topCard.suit}`,
        bottomCard: `${result.bottomCard.rank}${result.bottomCard.suit}`,
        middleCard: `${result.middleCard.rank}${result.middleCard.suit}`,
        winner: result.winner,
        deckOrder: result.deckOrder,
      })

      setTimeout(() => {
        onUpdate(session.id, session.completed + 1, result)
        setIsShuffling(false)
      }, 800)
    }, 1000)

    return () => clearInterval(interval)
  }, [session, masterSeed, player1, player2, onUpdate, onStreamOperation])

  const renderCard = (card: PlayingCard, label: string) => (
    <div className="flex flex-col items-center space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`
          w-16 h-20 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center
          text-sm font-bold shadow-lg transform transition-all duration-500
          ${isShuffling ? "scale-110 rotate-3" : "scale-100 rotate-0"}
          ${card.color === "red" ? "text-red-500" : "text-black"}
        `}
      >
        <div className="text-lg">{card.rank}</div>
        <div className="text-2xl">{card.suit}</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {currentShuffle && (
        <div className="space-y-4">
          {/* Shuffle Pattern */}
          <div className="text-center">
            <Badge variant="outline" className="text-sm">
              {currentShuffle.shufflePattern} Shuffle
            </Badge>
          </div>

          {/* Cards Display */}
          <div className="flex justify-center space-x-4">
            {renderCard(currentShuffle.topCard, "Top")}
            {renderCard(currentShuffle.middleCard, "Middle")}
            {renderCard(currentShuffle.bottomCard, "Bottom")}
          </div>

          {/* Winner Logic */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">
              Red = {player1} • Black = {player2}
            </div>
            <div className="font-semibold">
              Top Card: {currentShuffle.topCard.rank}
              {currentShuffle.topCard.suit} ({currentShuffle.topCard.color})
            </div>
            <div className="text-sm text-primary mt-1">{currentShuffle.winner} Wins!</div>
          </div>

          {/* Shuffle Animation */}
          {isShuffling && (
            <div className="flex justify-center">
              <div className="flex space-x-1">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-8 bg-primary/20 rounded animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Shuffles Complete</span>
          <span>
            {session.completed}/{session.count}
          </span>
        </div>
        <Progress value={(session.completed / session.count) * 100} className="h-2" />
      </div>
    </div>
  )
}
