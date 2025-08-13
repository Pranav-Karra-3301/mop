"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { deriveGameRandom } from "@/lib/crypto/seed"

interface GameSession {
  id: string
  type: string
  count: number
  completed: number
  results: any[]
  isRunning: boolean
  winner?: string
}

interface CoinFlipEngineProps {
  session: GameSession
  player1: string
  player2: string
  masterSeed: string
  onUpdate: (sessionId: string, completed: number, result?: any) => void
  onStreamOperation: (operation: any) => void
}

export function CoinFlipEngine({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: CoinFlipEngineProps) {
  const [currentFlip, setCurrentFlip] = useState<"heads" | "tails" | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [batchStats, setBatchStats] = useState({
    headsCount: 0,
    tailsCount: 0,
    player1Wins: 0,
    player2Wins: 0,
  })
  const intervalRef = useRef<NodeJS.Timeout>()
  const animationRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (session.isRunning && session.completed < session.count) {
      startProcessing()
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (animationRef.current) clearTimeout(animationRef.current)
    }
  }, [session.isRunning])

  const startProcessing = () => {
    // Process in batches of 50 for smooth animation
    const batchSize = 50
    const animationDelay = 100 // ms between batches

    intervalRef.current = setInterval(() => {
      if (session.completed >= session.count) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        return
      }

      processBatch(batchSize)
    }, animationDelay)
  }

  const processBatch = (batchSize: number) => {
    const remainingGames = session.count - session.completed
    const currentBatchSize = Math.min(batchSize, remainingGames)
    const results = []

    // Animate coin flip
    setIsAnimating(true)

    onStreamOperation({
      type: "crypto-operation",
      sessionId: session.id,
      operation: "batch-seed-derivation",
      batchSize: currentBatchSize,
      seedContext: `coin-assignment-${session.id}`,
      timestamp: Date.now(),
    })

    // Generate random assignment for this batch
    const assignmentRandom = deriveGameRandom(masterSeed, `coin-assignment-${session.id}`, session.completed)
    const headsPlayer = assignmentRandom < 0.5 ? player1 : player2
    const tailsPlayer = headsPlayer === player1 ? player2 : player1

    let batchHeads = 0
    let batchTails = 0
    let batchPlayer1Wins = 0
    let batchPlayer2Wins = 0

    for (let i = 0; i < currentBatchSize; i++) {
      const gameIndex = session.completed + i
      const flipRandom = deriveGameRandom(masterSeed, `coin-flip-${session.id}`, gameIndex)
      const result = flipRandom < 0.5 ? "heads" : "tails"
      const winner = result === "heads" ? headsPlayer : tailsPlayer

      results.push({
        gameIndex,
        result,
        winner,
        flipRandom,
        timestamp: Date.now(),
      })

      if (result === "heads") batchHeads++
      else batchTails++

      if (winner === player1) batchPlayer1Wins++
      else batchPlayer2Wins++

      if (i % 10 === 0) {
        onStreamOperation({
          type: "coin-flip-batch",
          sessionId: session.id,
          gameIndex,
          result,
          winner,
          batchProgress: (i / currentBatchSize) * 100,
          cryptoSeed: flipRandom.toFixed(6),
          timestamp: Date.now(),
        })
      }
    }

    onStreamOperation({
      type: "performance",
      sessionId: session.id,
      operation: "batch-complete",
      batchSize: currentBatchSize,
      headsCount: batchHeads,
      tailsCount: batchTails,
      processingTime: "~100ms",
      timestamp: Date.now(),
    })

    // Update visual state
    const lastResult = results[results.length - 1]
    setCurrentFlip(lastResult.result)

    // Update batch stats
    setBatchStats((prev) => ({
      headsCount: prev.headsCount + batchHeads,
      tailsCount: prev.tailsCount + batchTails,
      player1Wins: prev.player1Wins + batchPlayer1Wins,
      player2Wins: prev.player2Wins + batchPlayer2Wins,
    }))

    // Update session
    const newCompleted = session.completed + currentBatchSize
    onUpdate(session.id, newCompleted, lastResult)

    // Stop animation after a brief delay
    animationRef.current = setTimeout(() => {
      setIsAnimating(false)
    }, 80)
  }

  const progressPercent = (session.completed / session.count) * 100
  const gamesPerSecond = session.completed > 0 ? Math.round(session.completed / 10) : 0 // Rough estimate

  return (
    <div className="space-y-4">
      {/* Live Coin Animation */}
      <div className="flex justify-center">
        <div
          className={`w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl transition-transform duration-100 ${
            isAnimating ? "animate-spin" : ""
          }`}
        >
          {isAnimating ? "🪙" : currentFlip === "heads" ? "👑" : currentFlip === "tails" ? "🏛️" : "🪙"}
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="font-bold text-lg">{batchStats.headsCount.toLocaleString()}</div>
            <div className="text-muted-foreground">Heads</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="font-bold text-lg">{batchStats.tailsCount.toLocaleString()}</div>
            <div className="text-muted-foreground">Tails</div>
          </CardContent>
        </Card>
      </div>

      {/* Player Wins */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{player1}</span>
          <Badge variant="secondary">{batchStats.player1Wins.toLocaleString()}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{player2}</span>
          <Badge variant="secondary">{batchStats.player2Wins.toLocaleString()}</Badge>
        </div>
      </div>

      {/* Performance */}
      <div className="text-center text-xs text-muted-foreground">{gamesPerSecond.toLocaleString()} flips/sec</div>
    </div>
  )
}
