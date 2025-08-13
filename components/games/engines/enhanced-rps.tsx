"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SegmentedProgress } from "@/components/ui/segmented-progress"
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

interface EnhancedRPSProps {
  session: GameSession
  player1: string
  player2: string
  masterSeed: string
  onUpdate: (sessionId: string, completed: number, result?: any) => void
  onStreamOperation: (operation: any) => void
}

const MOVES = ["rock", "paper", "scissors"] as const
type Move = typeof MOVES[number]

const MOVE_ICONS = {
  rock: "/rock.svg",
  paper: "/paper.svg",
  scissors: "/scissor.svg",
}

const MOVE_BEATS = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
}

export function EnhancedRPS({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: EnhancedRPSProps) {
  const [currentGame, setCurrentGame] = useState<{
    player1Move: Move | null
    player2Move: Move | null
    winner: string | null
  }>({ player1Move: null, player2Move: null, winner: null })
  
  const [isAnimating, setIsAnimating] = useState(false)
  const [stats, setStats] = useState({
    player1Wins: 0,
    player2Wins: 0,
    ties: 0,
    rockCount: 0,
    paperCount: 0,
    scissorsCount: 0,
  })
  
  const intervalRef = useRef<NodeJS.Timeout>()
  const processedRef = useRef(0)

  useEffect(() => {
    processedRef.current = session.completed
    setStats({
      player1Wins: 0,
      player2Wins: 0,
      ties: 0,
      rockCount: 0,
      paperCount: 0,
      scissorsCount: 0,
    })
    
    // Count existing results
    session.results.forEach(result => {
      if (result.winner === player1) {
        setStats(prev => ({ ...prev, player1Wins: prev.player1Wins + 1 }))
      } else if (result.winner === player2) {
        setStats(prev => ({ ...prev, player2Wins: prev.player2Wins + 1 }))
      } else if (result.winner === "Tie") {
        setStats(prev => ({ ...prev, ties: prev.ties + 1 }))
      }
    })
  }, [session.id])

  useEffect(() => {
    if (session.isRunning && processedRef.current < session.count) {
      startProcessing()
    } else if (processedRef.current >= session.count && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [session.isRunning, session.count])

  const startProcessing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    const batchSize = 5
    const delay = 400 // Slower for better visualization
    
    intervalRef.current = setInterval(() => {
      if (processedRef.current >= session.count) {
        clearInterval(intervalRef.current!)
        intervalRef.current = undefined
        onStreamOperation({
          type: "game-complete",
          sessionId: session.id,
          message: `Rock-Paper-Scissors completed: ${session.count} games`,
          timestamp: Date.now(),
        })
        return
      }
      
      processBatch(batchSize)
    }, delay)
  }

  const determineWinner = (move1: Move, move2: Move): string => {
    if (move1 === move2) return "Tie"
    if (MOVE_BEATS[move1] === move2) return player1
    return player2
  }

  const processBatch = (batchSize: number) => {
    const remaining = session.count - processedRef.current
    const currentBatch = Math.min(batchSize, remaining)
    
    if (currentBatch <= 0) return
    
    setIsAnimating(true)
    
    const results = []
    
    for (let i = 0; i < currentBatch; i++) {
      const gameIndex = processedRef.current + i
      
      // Generate moves for both players
      const p1Seed = deriveGameRandom(masterSeed, `rps-p1-${session.id}`, gameIndex)
      const p2Seed = deriveGameRandom(masterSeed, `rps-p2-${session.id}`, gameIndex)
      
      const player1Move = MOVES[Math.floor(p1Seed * 3)]
      const player2Move = MOVES[Math.floor(p2Seed * 3)]
      
      const winner = determineWinner(player1Move, player2Move)
      
      results.push({
        gameIndex,
        player1Move,
        player2Move,
        winner,
        p1Seed: p1Seed.toFixed(6),
        p2Seed: p2Seed.toFixed(6),
        timestamp: Date.now(),
      })
      
      // Update stats
      if (winner === player1) {
        setStats(prev => ({ ...prev, player1Wins: prev.player1Wins + 1 }))
      } else if (winner === player2) {
        setStats(prev => ({ ...prev, player2Wins: prev.player2Wins + 1 }))
      } else {
        setStats(prev => ({ ...prev, ties: prev.ties + 1 }))
      }
      
      // Count moves
      setStats(prev => ({
        ...prev,
        [`${player1Move}Count`]: prev[`${player1Move}Count` as keyof typeof prev] + 1,
        [`${player2Move}Count`]: prev[`${player2Move}Count` as keyof typeof prev] + 1,
      }))
    }
    
    const lastResult = results[results.length - 1]
    setCurrentGame({
      player1Move: lastResult.player1Move,
      player2Move: lastResult.player2Move,
      winner: lastResult.winner,
    })
    
    processedRef.current += currentBatch
    
    // Log batch results
    onStreamOperation({
      type: "rps-batch",
      sessionId: session.id,
      batchSize: currentBatch,
      results: results.map(r => `${r.player1Move} vs ${r.player2Move} = ${r.winner}`).join(", "),
      completed: processedRef.current,
      total: session.count,
      timestamp: Date.now(),
    })
    
    // Update parent
    onUpdate(session.id, processedRef.current, lastResult)
    
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  const progress = (processedRef.current / session.count) * 100

  return (
    <div className="space-y-4">
      {/* Battle Animation */}
      <div className="relative h-44 md:h-48">
        {/* Preview/Placeholder before game starts */}
        {!currentGame.player1Move && !currentGame.player2Move && processedRef.current === 0 && (
          <div className="absolute inset-0 flex items-center justify-center gap-4 md:gap-8 opacity-40">
            <div className="flex flex-col items-center gap-2">
              <Image 
                src={MOVE_ICONS.rock} 
                alt="Rock" 
                width={60} 
                height={60} 
                className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] drop-shadow-lg filter brightness-110 contrast-110" 
              />
              <Badge variant="outline" className="text-xs">{player1}</Badge>
            </div>
            <div className="text-xl md:text-2xl font-bold text-muted-foreground">VS</div>
            <div className="flex flex-col items-center gap-2">
              <Image 
                src={MOVE_ICONS.scissors} 
                alt="Scissors" 
                width={60} 
                height={60} 
                className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] drop-shadow-lg filter brightness-110 contrast-110" 
              />
              <Badge variant="outline" className="text-xs">{player2}</Badge>
            </div>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {currentGame.player1Move && currentGame.player2Move && (
            <motion.div
              key={`${currentGame.player1Move}-${currentGame.player2Move}-${Date.now()}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center gap-4 md:gap-8"
            >
              {/* Player 1 Move */}
              <motion.div
                initial={{ x: -100, rotate: -180 }}
                animate={{ x: 0, rotate: 0 }}
                transition={{ type: "spring", damping: 10 }}
                className="flex flex-col items-center gap-2"
              >
                <Image 
                  src={MOVE_ICONS[currentGame.player1Move]} 
                  alt={currentGame.player1Move} 
                  width={60} 
                  height={60} 
                  className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] drop-shadow-lg filter brightness-110 contrast-110" 
                />
                <Badge variant="outline" className="text-xs">{player1}</Badge>
              </motion.div>

              {/* VS */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-muted-foreground"
              >
                VS
              </motion.div>

              {/* Player 2 Move */}
              <motion.div
                initial={{ x: 100, rotate: 180 }}
                animate={{ x: 0, rotate: 0 }}
                transition={{ type: "spring", damping: 10 }}
                className="flex flex-col items-center gap-2"
              >
                <Image 
                  src={MOVE_ICONS[currentGame.player2Move]} 
                  alt={currentGame.player2Move} 
                  width={60} 
                  height={60} 
                  className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] drop-shadow-lg filter brightness-110 contrast-110" 
                />
                <Badge variant="outline" className="text-xs">{player2}</Badge>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner Announcement */}
        <AnimatePresence>
          {currentGame.winner && !isAnimating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-0 left-0 right-0 text-center"
            >
              <Badge 
                variant={currentGame.winner === "Tie" ? "secondary" : "default"}
                className="text-sm"
              >
                {currentGame.winner === "Tie" ? "🤝 Tie!" : `${currentGame.winner} wins!`}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span className="font-mono">{processedRef.current}/{session.count}</span>
        </div>
        <SegmentedProgress value={progress} total={session.count} className="h-2" />
      </div>

      {/* Score Board */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{stats.player1Wins}</div>
            <div className="text-xs text-muted-foreground">{player1}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{stats.ties}</div>
            <div className="text-xs text-muted-foreground">Ties</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{stats.player2Wins}</div>
            <div className="text-xs text-muted-foreground">{player2}</div>
          </CardContent>
        </Card>
      </div>

      {/* Move Distribution */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="space-y-2">
          <Image 
            src={MOVE_ICONS.rock} 
            alt="Rock" 
            width={40} 
            height={40} 
            className="w-[56px] h-[56px] md:w-[64px] md:h-[64px] mx-auto drop-shadow-md filter brightness-105" 
          />
          <div className="text-sm font-medium">{stats.rockCount}</div>
        </div>
        <div className="space-y-2">
          <Image 
            src={MOVE_ICONS.paper} 
            alt="Paper" 
            width={40} 
            height={40} 
            className="w-[56px] h-[56px] md:w-[64px] md:h-[64px] mx-auto drop-shadow-md filter brightness-105" 
          />
          <div className="text-sm font-medium">{stats.paperCount}</div>
        </div>
        <div className="space-y-2">
          <Image 
            src={MOVE_ICONS.scissors} 
            alt="Scissors" 
            width={40} 
            height={40} 
            className="w-[56px] h-[56px] md:w-[64px] md:h-[64px] mx-auto drop-shadow-md filter brightness-105" 
          />
          <div className="text-sm font-medium">{stats.scissorsCount}</div>
        </div>
      </div>

      {/* Status */}
      <div className="text-center text-xs text-muted-foreground">
        {processedRef.current < session.count ? (
          <span className="flex items-center justify-center gap-1">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-green-500 rounded-full"
            />
            Processing...
          </span>
        ) : (
          <span className="text-green-600">✓ Complete</span>
        )}
      </div>
    </div>
  )
}