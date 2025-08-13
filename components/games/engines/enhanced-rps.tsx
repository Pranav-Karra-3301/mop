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
  
  const [allGames, setAllGames] = useState<Array<{
    player1Move: Move
    player2Move: Move
    winner: string
    round: number
  }>>([])
  
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
    
    const batchSize = 3
    const delay = 800 // Much slower for better viewing experience
    
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
    
    // Store all games for history display
    setAllGames(prev => [
      ...prev,
      ...results.map(result => ({
        player1Move: result.player1Move,
        player2Move: result.player2Move,
        winner: result.winner,
        round: result.gameIndex + 1
      }))
    ])
    
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
    
    // Update parent with all results from this batch
    onUpdate(session.id, processedRef.current, results)
    
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  const progress = (processedRef.current / session.count) * 100

  const totalMoves = stats.rockCount + stats.paperCount + stats.scissorsCount

  return (
    <div className="space-y-6">
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
                className="text-sm flex items-center gap-1"
              >
                {currentGame.winner === "Tie" ? (
                  <>🤝 Tie<Image src="/!.svg" alt="!" width={12} height={12} className="w-3 h-3" /></>
                ) : (
                  <>{currentGame.winner} wins<Image src="/!.svg" alt="!" width={12} height={12} className="w-3 h-3" /></>
                )}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">{processedRef.current}/{session.count}</span>
        {processedRef.current < session.count && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 bg-green-500 rounded-full"
          />
        )}
      </div>

      {/* Score Summary */}
      <div className="flex items-center justify-center gap-8 text-center">
        <div>
          <div className="text-2xl font-bold">{stats.player1Wins}</div>
          <div className="text-sm text-muted-foreground">{player1}</div>
        </div>
        <div className="text-muted-foreground">VS</div>
        <div>
          <div className="text-2xl font-bold">{stats.player2Wins}</div>
          <div className="text-sm text-muted-foreground">{player2}</div>
        </div>
        {stats.ties > 0 && (
          <>
            <div className="text-muted-foreground">|</div>
            <div>
              <div className="text-xl font-bold">{stats.ties}</div>
              <div className="text-sm text-muted-foreground">Ties</div>
            </div>
          </>
        )}
      </div>

      {/* Move Distribution Bar Graph */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Move Distribution</h4>
        <div className="space-y-3">
          {[
            { move: 'rock', icon: MOVE_ICONS.rock, count: stats.rockCount, color: 'bg-gray-500' },
            { move: 'paper', icon: MOVE_ICONS.paper, count: stats.paperCount, color: 'bg-blue-500' },
            { move: 'scissors', icon: MOVE_ICONS.scissors, count: stats.scissorsCount, color: 'bg-red-500' }
          ].map(({ move, icon, count, color }) => {
            const percentage = totalMoves > 0 ? (count / totalMoves) * 100 : 0
            return (
              <div key={move} className="flex items-center gap-3">
                <Image 
                  src={icon} 
                  alt={move} 
                  width={24} 
                  height={24} 
                  className="w-6 h-6 drop-shadow-sm filter brightness-105" 
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="capitalize font-medium">{move}</span>
                    <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* All Games History */}
      {allGames.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">All Rounds</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
            {allGames.map((game, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`p-2 rounded-lg border transition-colors ${
                  game.winner === player1 ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                  game.winner === player2 ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
                  'bg-muted/30 border-border'
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1 text-center">R{game.round}</div>
                <div className="flex items-center justify-center gap-1">
                  <Image 
                    src={MOVE_ICONS[game.player1Move]}
                    alt={game.player1Move}
                    width={16}
                    height={16}
                    className="w-4 h-4 drop-shadow-sm"
                  />
                  <div className="text-xs text-muted-foreground">vs</div>
                  <Image 
                    src={MOVE_ICONS[game.player2Move]}
                    alt={game.player2Move}
                    width={16}
                    height={16}
                    className="w-4 h-4 drop-shadow-sm"
                  />
                </div>
                <div className="text-xs text-center mt-1 font-medium">
                  {game.winner === "Tie" ? "Tie" : game.winner.slice(0, 1)}
                </div>
              </motion.div>
            ))}
            
            {/* Empty slots for remaining rounds */}
            {Array.from({ length: session.count - allGames.length }, (_, index) => (
              <div
                key={`empty-${index}`}
                className="p-2 rounded-lg border border-dashed border-muted/50 flex items-center justify-center"
              >
                <div className="text-xs text-muted-foreground">R{allGames.length + index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}