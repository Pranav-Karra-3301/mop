"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { deriveGameRandom } from "@/lib/crypto/seed"
import Image from "next/image"

interface GameSession {
  id: string
  type: string
  count: number
  completed: number
  results: any[]
  isRunning: boolean
  winner?: string
}

interface RockPaperScissorsEngineProps {
  session: GameSession
  player1: string
  player2: string
  masterSeed: string
  onUpdate: (sessionId: string, completed: number, result?: any) => void
  onStreamOperation: (operation: any) => void
}

const MOVES = ["rock", "paper", "scissors"] as const
type Move = (typeof MOVES)[number]

const MOVE_ICONS = {
  rock: "/rock.svg",
  paper: "/paper.svg",
  scissors: "/scissor.svg",
}

export function RockPaperScissorsEngine({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: RockPaperScissorsEngineProps) {
  const [currentGame, setCurrentGame] = useState<{
    player1Move: Move
    player2Move: Move
    winner: string
  } | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameStats, setGameStats] = useState({
    player1Wins: 0,
    player2Wins: 0,
    ties: 0,
    rockCount: 0,
    paperCount: 0,
    scissorsCount: 0,
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

  const determineWinner = (move1: Move, move2: Move): "player1" | "player2" | "tie" => {
    if (move1 === move2) return "tie"
    if (
      (move1 === "rock" && move2 === "scissors") ||
      (move1 === "paper" && move2 === "rock") ||
      (move1 === "scissors" && move2 === "paper")
    ) {
      return "player1"
    }
    return "player2"
  }

  const startProcessing = () => {
    // Process games faster than coin flips but with visible animations
    const batchSize = 10
    const animationDelay = 200 // ms between batches

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

    setIsPlaying(true)

    let batchPlayer1Wins = 0
    let batchPlayer2Wins = 0
    let batchTies = 0
    let batchRock = 0
    let batchPaper = 0
    let batchScissors = 0

    for (let i = 0; i < currentBatchSize; i++) {
      const gameIndex = session.completed + i

      // Generate moves for both players
      const player1Random = deriveGameRandom(masterSeed, `rps-p1-${session.id}`, gameIndex)
      const player2Random = deriveGameRandom(masterSeed, `rps-p2-${session.id}`, gameIndex)

      const player1Move = MOVES[Math.floor(player1Random * 3)]
      const player2Move = MOVES[Math.floor(player2Random * 3)]

      const gameResult = determineWinner(player1Move, player2Move)
      const winner = gameResult === "player1" ? player1 : gameResult === "player2" ? player2 : "Tie"

      results.push({
        gameIndex,
        player1Move,
        player2Move,
        result: gameResult,
        winner,
        timestamp: Date.now(),
      })

      // Update batch stats
      if (gameResult === "player1") batchPlayer1Wins++
      else if (gameResult === "player2") batchPlayer2Wins++
      else batchTies++

      // Count moves
      if (player1Move === "rock" || player2Move === "rock") batchRock++
      if (player1Move === "paper" || player2Move === "paper") batchPaper++
      if (player1Move === "scissors" || player2Move === "scissors") batchScissors++

      if (i % 5 === 0) {
        onStreamOperation({
          type: "rps-game",
          sessionId: session.id,
          gameIndex,
          player1Move,
          player2Move,
          winner,
          player1Random: player1Random.toFixed(6),
          player2Random: player2Random.toFixed(6),
          gameLogic: `${player1Move} vs ${player2Move} = ${gameResult}`,
          timestamp: Date.now(),
        })
      }
    }

    // Show last game visually
    const lastGame = results[results.length - 1]
    setCurrentGame({
      player1Move: lastGame.player1Move,
      player2Move: lastGame.player2Move,
      winner: lastGame.winner,
    })

    // Update stats
    setGameStats((prev) => ({
      player1Wins: prev.player1Wins + batchPlayer1Wins,
      player2Wins: prev.player2Wins + batchPlayer2Wins,
      ties: prev.ties + batchTies,
      rockCount: prev.rockCount + batchRock,
      paperCount: prev.paperCount + batchPaper,
      scissorsCount: prev.scissorsCount + batchScissors,
    }))

    // Update session
    const newCompleted = session.completed + currentBatchSize
    onUpdate(session.id, newCompleted, lastGame)

    // Stop animation
    animationRef.current = setTimeout(() => {
      setIsPlaying(false)
    }, 150)
  }

  const gamesPerSecond = session.completed > 0 ? Math.round(session.completed / 20) : 0

  return (
    <div className="space-y-4">
      {/* Current Game Display */}
      <div className="text-center space-y-2">
        {currentGame && (
          <div className="flex justify-center items-center gap-4">
            <div className="text-center">
              <div className={`transition-transform duration-200 ${isPlaying ? "animate-bounce" : ""}`}>
                <Image 
                  src={MOVE_ICONS[currentGame.player1Move]} 
                  alt={currentGame.player1Move} 
                  width={50} 
                  height={50} 
                  className="w-[70px] h-[70px] md:w-[90px] md:h-[90px] drop-shadow-lg filter brightness-110 contrast-110" 
                />
              </div>
              <div className="text-xs text-muted-foreground">{player1}</div>
            </div>
            <div className="text-2xl">⚔️</div>
            <div className="text-center">
              <div className={`transition-transform duration-200 ${isPlaying ? "animate-bounce" : ""}`}>
                <Image 
                  src={MOVE_ICONS[currentGame.player2Move]} 
                  alt={currentGame.player2Move} 
                  width={50} 
                  height={50} 
                  className="w-[70px] h-[70px] md:w-[90px] md:h-[90px] drop-shadow-lg filter brightness-110 contrast-110" 
                />
              </div>
              <div className="text-xs text-muted-foreground">{player2}</div>
            </div>
          </div>
        )}
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="font-bold text-lg">{gameStats.player1Wins}</div>
            <div className="text-muted-foreground text-xs">{player1}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="font-bold text-lg">{gameStats.ties}</div>
            <div className="text-muted-foreground text-xs">Ties</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="font-bold text-lg">{gameStats.player2Wins}</div>
            <div className="text-muted-foreground text-xs">{player2}</div>
          </CardContent>
        </Card>
      </div>

      {/* Move Distribution */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="space-y-1">
          <Image 
            src={MOVE_ICONS.rock} 
            alt="Rock" 
            width={32} 
            height={32} 
            className="w-[48px] h-[48px] md:w-[56px] md:h-[56px] mx-auto drop-shadow-md filter brightness-105" 
          />
          <div className="text-sm font-medium">{gameStats.rockCount}</div>
        </div>
        <div className="space-y-1">
          <Image 
            src={MOVE_ICONS.paper} 
            alt="Paper" 
            width={32} 
            height={32} 
            className="w-[48px] h-[48px] md:w-[56px] md:h-[56px] mx-auto drop-shadow-md filter brightness-105" 
          />
          <div className="text-sm font-medium">{gameStats.paperCount}</div>
        </div>
        <div className="space-y-1">
          <Image 
            src={MOVE_ICONS.scissors} 
            alt="Scissors" 
            width={32} 
            height={32} 
            className="w-[48px] h-[48px] md:w-[56px] md:h-[56px] mx-auto drop-shadow-md filter brightness-105" 
          />
          <div className="text-sm font-medium">{gameStats.scissorsCount}</div>
        </div>
      </div>

      {/* Performance */}
      <div className="text-center text-xs text-muted-foreground">{gamesPerSecond} games/sec</div>
    </div>
  )
}
