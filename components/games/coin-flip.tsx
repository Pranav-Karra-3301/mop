"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { deriveGameRandom } from "@/lib/crypto/seed"

interface CoinFlipProps {
  player1: string
  player2: string
  seed: string
  onComplete: (winner: string) => void
  onDebugOperation: (type: string, data: any) => void
}

export function CoinFlip({ player1, player2, seed, onComplete, onDebugOperation }: CoinFlipProps) {
  const [isFlipping, setIsFlipping] = useState(false)
  const [result, setResult] = useState<"heads" | "tails" | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<{ heads: string; tails: string } | null>(null)

  useEffect(() => {
    // Randomly assign players to heads/tails
    const assignmentRandom = deriveGameRandom(seed, "assignment", 0)
    const headsPlayer = assignmentRandom < 0.5 ? player1 : player2
    const tailsPlayer = headsPlayer === player1 ? player2 : player1

    const newAssignment = { heads: headsPlayer, tails: tailsPlayer }
    setAssignment(newAssignment)

    onDebugOperation("player-assignment", {
      assignmentRandom,
      assignment: newAssignment,
    })
  }, [seed, player1, player2, onDebugOperation])

  const flipCoin = async () => {
    if (!assignment) return

    setIsFlipping(true)

    // Generate the actual coin flip result
    const flipRandom = deriveGameRandom(seed, "coin-flip", 1)
    const coinResult: "heads" | "tails" = flipRandom < 0.5 ? "heads" : "tails"
    const gameWinner = assignment[coinResult]

    onDebugOperation("coin-flip", {
      flipRandom,
      result: coinResult,
      winner: gameWinner,
    })

    // Simulate coin flip animation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setResult(coinResult)
    setWinner(gameWinner)
    setIsFlipping(false)

    // Complete the game after showing result
    setTimeout(() => {
      onComplete(gameWinner)
    }, 1500)
  }

  if (!assignment) return null

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Coin Flip</h2>
        <p className="text-muted-foreground">Fair and random - may the odds be in your favor</p>
      </div>

      {/* Player Assignments */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">🪙</div>
            <div className="font-semibold">{assignment.heads}</div>
            <Badge variant="secondary" className="mt-2">
              Heads
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">🪙</div>
            <div className="font-semibold">{assignment.tails}</div>
            <Badge variant="secondary" className="mt-2">
              Tails
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Coin Animation */}
      <div className="flex justify-center">
        <div
          className={`w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl transition-transform duration-500 ${
            isFlipping ? "animate-spin" : ""
          }`}
        >
          {isFlipping ? "🪙" : result === "heads" ? "👑" : result === "tails" ? "🏛️" : "🪙"}
        </div>
      </div>

      {/* Result */}
      {result && winner && !isFlipping && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {result.charAt(0).toUpperCase() + result.slice(1)}!
            </div>
            <div className="text-xl">
              <span className="font-semibold">{winner}</span> wins the flip
            </div>
          </div>
        </div>
      )}

      {/* Flip Button */}
      {!isFlipping && !result && (
        <Button onClick={flipCoin} size="lg" className="h-14 px-8 text-lg font-semibold">
          Flip the Coin
        </Button>
      )}
    </div>
  )
}
