"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Play, RotateCcw, Activity, Sparkles } from "lucide-react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { generateGameSeed, createGameId } from "@/lib/crypto/seed"
import { ModernDashboard } from "@/components/games/modern-dashboard"
import { SegmentedProgress } from "@/components/ui/segmented-progress"

interface GameSession {
  id: string
  type: "coin-flip" | "rock-paper-scissors" | "high-card"
  count: number
  completed: number
  results: any[]
  isRunning: boolean
  winner?: string
}

interface AppState {
  player1: string
  player2: string
  sessions: GameSession[]
  isRunning: boolean
  masterSeed: string | null
}

const gameConfigs = [
  { 
    type: "coin-flip", 
    count: 100, 
    label: "Coin Flips",
    description: "Fast decisions",
    icon: "/coinflip.gif"
  },
  {
    type: "rock-paper-scissors",
    count: 50,
    label: "Rock Paper Scissors",
    description: "Strategic battles",
    icon: "/scissor.svg"
  },
  { 
    type: "high-card", 
    count: 25, 
    label: "High Card",
    description: "Card showdown",
    icon: "/cards.svg"
  },
]

export default function ModernGamingPage() {
  const [appState, setAppState] = useState<AppState>({
    player1: "Pranav",
    player2: "Manit",
    sessions: [],
    isRunning: false,
    masterSeed: null,
  })
  
  const [mounted, setMounted] = useState(false)
  const { setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    // Automatically detect system theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    } else {
      setTheme('light')
    }
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const startGameSessions = async () => {
    if (!appState.player1.trim() || !appState.player2.trim()) return

    const masterSeed = await generateGameSeed(createGameId())
    const masterSeedHex = Array.from(masterSeed)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const newSessions: GameSession[] = gameConfigs.map((config) => ({
      id: createGameId(),
      type: config.type as any,
      count: config.count,
      completed: 0,
      results: [],
      isRunning: true,
    }))

    setAppState((prev) => ({
      ...prev,
      sessions: newSessions,
      isRunning: true,
      masterSeed: masterSeedHex,
    }))
  }

  const updateSessionProgress = (sessionId: string, completed: number, result?: any) => {
    setAppState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          const newResults = result ? [...session.results, result] : session.results
          const isComplete = completed >= session.count
          return {
            ...session,
            completed,
            results: newResults,
            isRunning: !isComplete,
            winner: isComplete ? determineSessionWinner(session.type, newResults) : undefined,
          }
        }
        return session
      }),
    }))

    const allComplete = appState.sessions.every((s) => s.completed >= s.count)
    if (allComplete) {
      setAppState((prev) => ({ ...prev, isRunning: false }))
    }
  }

  const determineSessionWinner = (gameType: string, results: any[]): string => {
    if (results.length === 0) return "No winner"

    const player1Wins = results.filter((r) => r.winner === appState.player1).length
    const player2Wins = results.filter((r) => r.winner === appState.player2).length

    if (player1Wins > player2Wins) return appState.player1
    if (player2Wins > player1Wins) return appState.player2
    return "Tie"
  }

  const resetAll = () => {
    setAppState({
      player1: "Pranav",
      player2: "Manit",
      sessions: [],
      isRunning: false,
      masterSeed: null,
    })
  }

  const canStart = appState.player1.trim() && appState.player2.trim() && !appState.isRunning
  const hasActiveSessions = appState.sessions.length > 0
  const totalGames = gameConfigs.reduce((sum, config) => sum + config.count, 0)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

      {/* Replay Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={resetAll}
        className="fixed top-6 right-6 z-50 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-all duration-300 shadow-lg"
        title="Replay All Games"
      >
        <RotateCcw className="h-5 w-5 text-foreground" />
      </motion.button>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {!hasActiveSessions ? (
            /* Setup Interface */
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Header */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Image
                  src="/Logo.svg"
                  alt="Logo"
                  fill={false}
                  width={0}
                  height={0}
                  sizes="(min-width: 0px) 40vw, 100vw"
                  className="mx-auto w-[min(40vw,220px)] h-auto mb-6 drop-shadow-md filter brightness-110"
                  priority
                />
                <motion.p 
                  className="text-xl text-muted-foreground max-w-2xl mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Settle any debate with style
                </motion.p>
              </motion.div>

              {/* Player Setup */}
              <motion.div 
                className="max-w-2xl mx-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-8 border border-border/50 shadow-2xl">
                  <h2 className="text-2xl font-semibold mb-6 text-center">Who's playing?</h2>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <motion.div className="flex-1 w-full" whileHover={{ scale: 1.02 }}>
                      <input
                        placeholder="Player 1"
                        value={appState.player1}
                        onChange={(e) => setAppState((prev) => ({ ...prev, player1: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-center text-lg"
                      />
                    </motion.div>
                    
                    <div className="text-2xl font-light text-muted-foreground">VS</div>
                    
                    <motion.div className="flex-1 w-full" whileHover={{ scale: 1.02 }}>
                      <input
                        placeholder="Player 2"
                        value={appState.player2}
                        onChange={(e) => setAppState((prev) => ({ ...prev, player2: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-center text-lg"
                      />
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Game Preview Cards */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {gameConfigs.map((config, index) => (
                  <motion.div
                    key={config.type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="relative"
                  >
                    <div className="relative bg-card rounded-2xl p-6 border border-border transition-all duration-300">
                      <div className="text-center space-y-4">
                        <div className="flex justify-center">
                          <Image 
                            src={config.icon} 
                            alt={config.label} 
                            width={64} 
                            height={64} 
                            className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 drop-shadow-md filter brightness-110" 
                          />
                        </div>
                        <h3 className="font-semibold text-lg">{config.label}</h3>
                        <div className="text-3xl font-bold text-foreground">
                          {config.count}
                        </div>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Launch Button */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
              >
                <motion.button
                  onClick={startGameSessions}
                  disabled={!canStart}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    px-8 py-4 rounded-2xl font-semibold text-lg
                    inline-flex items-center gap-3 shadow-2xl
                    transition-all duration-300
                    ${canStart 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'bg-muted text-muted-foreground cursor-not-allowed'}
                  `}
                >
                  <Play className="h-5 w-5" />
                  Start Gaming
                </motion.button>
                <motion.p 
                  className="mt-4 text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  {totalGames} games ready to run
                </motion.p>
              </motion.div>
            </motion.div>
          ) : (
            /* Active Games Interface */
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Header with stats */}
              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-4">
                  <Image 
                    src="/eyes.svg" 
                    alt="Eyes" 
                    width={48} 
                    height={48} 
                    className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 drop-shadow-lg filter brightness-110" 
                  />
                  <div>
                    <h1 className="text-2xl font-bold">{appState.player1} vs {appState.player2}</h1>
                    <p className="text-sm text-muted-foreground">
                      {appState.sessions.reduce((sum, s) => sum + s.completed, 0)} / {totalGames} games complete
                    </p>
                  </div>
                </div>
                
                {!appState.isRunning && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={resetAll}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-xl bg-card border border-border hover:border-border transition-all duration-300 inline-flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    New Game
                  </motion.button>
                )}
              </motion.div>

              {/* Overall Progress */}
              <motion.div 
                className="bg-card rounded-xl p-4 border border-border mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Overall Progress</h3>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((appState.sessions.reduce((sum, s) => sum + s.completed, 0) / totalGames) * 100)}% Complete
                  </span>
                </div>
                <SegmentedProgress 
                  value={(appState.sessions.reduce((sum, s) => sum + s.completed, 0) / totalGames) * 100}
                  total={175}
                  className="h-2"
                />
              </motion.div>

              {/* Modern Dashboard */}
              <ModernDashboard
                sessions={appState.sessions}
                player1={appState.player1}
                player2={appState.player2}
                masterSeed={appState.masterSeed!}
                onSessionUpdate={updateSessionProgress}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
