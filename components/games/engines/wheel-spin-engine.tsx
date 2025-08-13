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

interface WheelSpinEngineProps {
  session: GameSession
  player1: string
  player2: string
  masterSeed: string
  onUpdate: (sessionId: string, completed: number, result?: any) => void
  onStreamOperation: (operation: any) => void
}

const WHEEL_SEGMENTS = [
  { color: "#64748b", player: 1, label: "A" },
  { color: "#475569", player: 2, label: "B" },
  { color: "#64748b", player: 1, label: "C" },
  { color: "#475569", player: 2, label: "D" },
  { color: "#64748b", player: 1, label: "E" },
  { color: "#475569", player: 2, label: "F" },
  { color: "#64748b", player: 1, label: "G" },
  { color: "#475569", player: 2, label: "H" },
] as const

export function WheelSpinEngine({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: WheelSpinEngineProps) {
  const [currentSpin, setCurrentSpin] = useState<{
    segment: (typeof WHEEL_SEGMENTS)[number]
    winner: string
    rotation: number
  } | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinStats, setSpinStats] = useState({
    player1Wins: 0,
    player2Wins: 0,
    segmentCounts: Object.fromEntries(WHEEL_SEGMENTS.map((s) => [s.label, 0])),
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
    // Process wheel spins with dramatic animations
    const batchSize = 5
    const animationDelay = 500 // Slower for dramatic effect

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

    setIsSpinning(true)

    let batchPlayer1Wins = 0
    let batchPlayer2Wins = 0
    const batchSegmentCounts = { ...spinStats.segmentCounts }

    for (let i = 0; i < currentBatchSize; i++) {
      const gameIndex = session.completed + i

      // Generate wheel spin result
      const spinRandom = deriveGameRandom(masterSeed, `wheel-spin-${session.id}`, gameIndex)
      const segmentIndex = Math.floor(spinRandom * WHEEL_SEGMENTS.length)
      const segment = WHEEL_SEGMENTS[segmentIndex]
      const winner = segment.player === 1 ? player1 : player2

      // Calculate rotation for visual effect
      const rotation = spinRandom * 360 * 5 + segmentIndex * (360 / WHEEL_SEGMENTS.length)

      results.push({
        gameIndex,
        segment: segment.label,
        segmentColor: segment.color,
        winner,
        rotation,
        spinRandom,
        timestamp: Date.now(),
      })

      // Update batch stats
      if (segment.player === 1) batchPlayer1Wins++
      else batchPlayer2Wins++

      batchSegmentCounts[segment.label]++

      // Stream operations
      if (i % 2 === 0) {
        onStreamOperation({
          type: "wheel-spin",
          sessionId: session.id,
          gameIndex,
          segment: segment.label,
          winner,
          spinRandom: spinRandom.toFixed(6),
          segmentIndex,
          rotationDegrees: rotation.toFixed(2),
          probability: ((1 / WHEEL_SEGMENTS.length) * 100).toFixed(1) + "%",
          timestamp: Date.now(),
        })
      }
    }

    // Show last spin visually
    const lastSpin = results[results.length - 1]
    setCurrentSpin({
      segment: WHEEL_SEGMENTS.find((s) => s.label === lastSpin.segment)!,
      winner: lastSpin.winner,
      rotation: lastSpin.rotation,
    })

    // Update stats
    setSpinStats((prev) => ({
      player1Wins: prev.player1Wins + batchPlayer1Wins,
      player2Wins: prev.player2Wins + batchPlayer2Wins,
      segmentCounts: batchSegmentCounts,
    }))

    // Update session
    const newCompleted = session.completed + currentBatchSize
    onUpdate(session.id, newCompleted, results[results.length - 1])

    // Stop spinning animation
    animationRef.current = setTimeout(() => {
      setIsSpinning(false)
    }, 400)
  }

  const spinsPerSecond = session.completed > 0 ? Math.round(session.completed / 30) : 0

  return (
    <div className="space-y-4">
      {/* Wheel Animation */}
      <div className="flex justify-center">
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full border-4 border-muted transition-transform duration-500 ${
              isSpinning ? "animate-spin" : ""
            }`}
            style={{
              background: currentSpin
                ? `conic-gradient(from 0deg, ${WHEEL_SEGMENTS.map(
                    (s, i) =>
                      `${s.color} ${i * (360 / WHEEL_SEGMENTS.length)}deg ${(i + 1) * (360 / WHEEL_SEGMENTS.length)}deg`,
                  ).join(", ")})`
                : "conic-gradient(from 0deg, #64748b 0deg 45deg, #475569 45deg 90deg, #64748b 90deg 135deg, #475569 135deg 180deg, #64748b 180deg 225deg, #475569 225deg 270deg, #64748b 270deg 315deg, #475569 315deg 360deg)",
              transform: currentSpin && !isSpinning ? `rotate(${currentSpin.rotation}deg)` : undefined,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full shadow-lg"></div>
            </div>
          </div>
          {/* Pointer */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-foreground"></div>
        </div>
      </div>

      {/* Current Result */}
      {currentSpin && (
        <div className="text-center">
          <Badge variant="secondary" className="text-sm" style={{ backgroundColor: `${currentSpin.segment.color}20` }}>
            {currentSpin.segment.label} - {currentSpin.winner}
          </Badge>
        </div>
      )}

      {/* Player Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="font-bold text-lg">{spinStats.player1Wins}</div>
            <div className="text-muted-foreground text-xs">{player1}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="font-bold text-lg">{spinStats.player2Wins}</div>
            <div className="text-muted-foreground text-xs">{player2}</div>
          </CardContent>
        </Card>
      </div>

      {/* Segment Distribution */}
      <div className="grid grid-cols-4 gap-1 text-xs">
        {WHEEL_SEGMENTS.map((segment) => (
          <div key={segment.label} className="text-center">
            <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ backgroundColor: segment.color }}></div>
            <div className="font-semibold">{spinStats.segmentCounts[segment.label]}</div>
            <div className="text-muted-foreground text-xs">{segment.label}</div>
          </div>
        ))}
      </div>

      {/* Performance */}
      <div className="text-center text-xs text-muted-foreground">{spinsPerSecond} spins/sec</div>
    </div>
  )
}
