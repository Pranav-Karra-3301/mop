"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, Code, Zap, Shield } from "lucide-react"

interface DebugOperation {
  id: string
  type: string
  timestamp: number
  data: any
}

interface DebugPanelProps {
  operations: DebugOperation[]
  gameState: any
  onClose: () => void
}

export function DebugPanel({ operations, gameState, onClose }: DebugPanelProps) {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatHex = (hex: string) => {
    return hex.match(/.{1,8}/g)?.join(" ") || hex
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            <CardTitle>Technical Dashboard</CardTitle>
            <Badge variant="secondary" className="ml-2">
              <Shield className="h-3 w-3 mr-1" />
              Provably Fair
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Game State */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Current Game State
            </h3>
            <Card className="bg-muted/50">
              <CardContent className="p-4 font-mono text-sm">
                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">Game ID:</span> {gameState.gameId || "None"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Players:</span> [{gameState.player1}, {gameState.player2}]
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seed:</span>{" "}
                    {gameState.seed ? formatHex(gameState.seed) : "None"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    {gameState.isPlaying ? "Playing" : gameState.winner ? "Complete" : "Setup"}
                  </div>
                  {gameState.winner && (
                    <div>
                      <span className="text-muted-foreground">Winner:</span> {gameState.winner}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Operations Log */}
          <div className="space-y-3">
            <h3 className="font-semibold">Cryptographic Operations</h3>
            {operations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No operations recorded yet</p>
            ) : (
              <div className="space-y-3">
                {operations.map((op) => (
                  <Card key={op.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {op.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(op.timestamp)}</span>
                      </div>

                      <div className="font-mono text-sm space-y-1">
                        {op.type === "game-start" && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Game ID:</span> {op.data.gameId}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Players:</span> [{op.data.players.join(", ")}]
                            </div>
                            <div>
                              <span className="text-muted-foreground">Master Seed:</span> {formatHex(op.data.seed)}
                            </div>
                          </>
                        )}

                        {op.type === "player-assignment" && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Assignment Random:</span>{" "}
                              {op.data.assignmentRandom.toFixed(6)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Heads:</span> {op.data.assignment.heads}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tails:</span> {op.data.assignment.tails}
                            </div>
                          </>
                        )}

                        {op.type === "coin-flip" && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Flip Random:</span>{" "}
                              {op.data.flipRandom.toFixed(6)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Result:</span> {op.data.result}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Winner:</span> {op.data.winner}
                            </div>
                          </>
                        )}

                        {op.type === "game-complete" && (
                          <div>
                            <span className="text-muted-foreground">Final Winner:</span> {op.data.winner}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
