'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Clock, HelpCircle, Plus, Trash2, RefreshCw, RotateCcw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getRandomWords } from "./app/actions/word-actions"

const COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
]

type WordPosition = {
  word: string;
  startX: number;
  startY: number;
  direction: [number, number];
}

export default function SopaDeLetras() {
  const [words, setWords] = useState<string[]>([])
  const [newWord, setNewWord] = useState('')
  const [grid, setGrid] = useState<string[][]>([])
  const [gridSize, setGridSize] = useState(10)
  const [foundWords, setFoundWords] = useState<string[]>([])
  const [selection, setSelection] = useState<number[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [allFound, setAllFound] = useState(false)
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [hintCell, setHintCell] = useState<{ row: number; col: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [wordPositions, setWordPositions] = useState<WordPosition[]>([])
  const [wordCount, setWordCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1)
      }, 1000)
    } else if (!isRunning && interval) {
      clearInterval(interval)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  useEffect(() => {
    if (hintCell) {
      const timer = setTimeout(() => {
        setHintCell(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [hintCell])

  const addWords = () => {
    const wordsToAdd = newWord
      .toUpperCase()
      .split(/[,\n]+/)
      .map(word => word.trim().replace(/\s+/g, ''))
      .filter(word => word && !words.includes(word) && word.length > 1)

    if (wordsToAdd.length > 0) {
      setWords([...words, ...wordsToAdd])
      setNewWord('')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewWord(e.target.value)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    setNewWord(prevWord => prevWord + pastedText)
  }

  const removeWord = (wordToRemove: string) => {
    setWords(words.filter(word => word !== wordToRemove))
  }

  const clearWords = () => {
    setWords([])
  }

  const generateRandomWords = async () => {
    setIsLoading(true)
    try {
      const randomWords = await getRandomWords(wordCount)
      // Filtrar palabras que ya existen en la lista
      const newWords = randomWords.filter(word => !words.includes(word))
      setWords([...words, ...newWords])
    } catch (error) {
      console.error('Error al generar palabras aleatorias:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateGrid = () => {
    const maxWordLength = Math.max(...words.map(word => word.length))
    const size = Math.max(10, maxWordLength + 2)
    setGridSize(size)

    const newGrid = Array(size).fill(null).map(() => Array(size).fill(''))
    // Definir todas las direcciones posibles: horizontal, vertical, diagonal (en ambos sentidos)
    const directions = [
      [0, 1],   // Horizontal (derecha)
      [1, 0],   // Vertical (abajo)
      [1, 1],   // Diagonal (abajo-derecha)
      [-1, 1],  // Diagonal (arriba-derecha)
      [0, -1],  // Horizontal (izquierda)
      [-1, 0],  // Vertical (arriba)
      [-1, -1], // Diagonal (arriba-izquierda)
      [1, -1]   // Diagonal (abajo-izquierda)
    ]

    const newWordPositions: WordPosition[] = []

    words.forEach(word => {
      let placed = false
      let attempts = 0
      const maxAttempts = 100 // Límite de intentos para evitar bucles infinitos
      
      while (!placed && attempts < maxAttempts) {
        attempts++
        const direction = directions[Math.floor(Math.random() * directions.length)]
        const startX = Math.floor(Math.random() * size)
        const startY = Math.floor(Math.random() * size)

        if (canPlaceWord(newGrid, word, startX, startY, direction)) {
          placeWord(newGrid, word, startX, startY, direction)
          newWordPositions.push({ word, startX, startY, direction })
          placed = true
        }
      }
      
      // Si no se pudo colocar después de muchos intentos, lo omitimos
      if (!placed) {
        console.warn(`No se pudo colocar la palabra: ${word}`)
      }
    })

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (newGrid[i][j] === '') {
          newGrid[i][j] = String.fromCharCode(65 + Math.floor(Math.random() * 26))
        }
      }
    }

    setGrid(newGrid)
    setWordPositions(newWordPositions)
    setGameStarted(true)
    setIsRunning(true)
    setFoundWords([])
    setAllFound(false)
    setTime(0)
  }

  const canPlaceWord = (grid: string[][], word: string, startX: number, startY: number, [dx, dy]: number[]) => {
    if (startX + dx * (word.length - 1) < 0 || startX + dx * (word.length - 1) >= grid.length) return false
    if (startY + dy * (word.length - 1) < 0 || startY + dy * (word.length - 1) >= grid.length) return false

    for (let i = 0; i < word.length; i++) {
      const x = startX + i * dx
      const y = startY + i * dy
      if (grid[y][x] !== '' && grid[y][x] !== word[i]) return false
    }

    return true
  }

  const placeWord = (grid: string[][], word: string, startX: number, startY: number, [dx, dy]: number[]) => {
    for (let i = 0; i < word.length; i++) {
      const x = startX + i * dx
      const y = startY + i * dy
      grid[y][x] = word[i]
    }
  }

  const handleCellMouseDown = (rowIndex: number, colIndex: number) => {
    if (!gameStarted) return
    setIsSelecting(true)
    setSelection([rowIndex * gridSize + colIndex])
  }

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (!gameStarted || !isSelecting) return
    const index = rowIndex * gridSize + colIndex
    if (!selection.includes(index)) {
      setSelection([...selection, index])
    }
  }

  const handleCellMouseUp = () => {
    setIsSelecting(false)
    checkSelection()
  }

  const checkSelection = () => {
    if (selection.length < 2) return

    const selectedIndices = selection.sort((a, b) => a - b)
    const selectedWord = selectedIndices.map(index => {
      const row = Math.floor(index / gridSize)
      const col = index % gridSize
      return grid[row][col]
    }).join('')

    const reversedWord = selectedWord.split('').reverse().join('')

    if (words.includes(selectedWord) && !foundWords.includes(selectedWord)) {
      setFoundWords([...foundWords, selectedWord])
    } else if (words.includes(reversedWord) && !foundWords.includes(reversedWord)) {
      setFoundWords([...foundWords, reversedWord])
    }

    setSelection([])
  }

  useEffect(() => {
    if (foundWords.length === words.length && words.length > 0) {
      setAllFound(true)
      setIsRunning(false)
    }
  }, [foundWords, words])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getHint = () => {
    const remainingWords = words.filter(word => !foundWords.includes(word))
    if (remainingWords.length > 0) {
      const hintWord = remainingWords[Math.floor(Math.random() * remainingWords.length)]
      const hintPosition = wordPositions.find(pos => pos.word === hintWord)
      if (hintPosition) {
        const randomIndex = Math.floor(Math.random() * hintWord.length)
        const hintX = hintPosition.startX + randomIndex * hintPosition.direction[0]
        const hintY = hintPosition.startY + randomIndex * hintPosition.direction[1]
        setHintCell({ row: hintY, col: hintX })
      }
    }
  }

  const getWordColor = (word: string) => {
    const index = words.indexOf(word) % COLORS.length
    return COLORS[index]
  }

  const isCellInWord = (rowIndex: number, colIndex: number, word: string) => {
    const position = wordPositions.find(pos => pos.word === word)
    if (!position) return false

    const { startX, startY, direction } = position
    for (let i = 0; i < word.length; i++) {
      const x = startX + i * direction[0]
      const y = startY + i * direction[1]
      if (x === colIndex && y === rowIndex) return true
    }
    return false
  }

  const resetGame = () => {
    setGameStarted(false)
    setGrid([])
    setFoundWords([])
    setSelection([])
    setAllFound(false)
    setTime(0)
    setIsRunning(false)
    setHintCell(null)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl sm:text-3xl md:text-4xl text-center">Sopa de Letras</CardTitle>
      </CardHeader>
      <CardContent>
        {!gameStarted ? (
          <div className="space-y-4">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Palabras Manuales</TabsTrigger>
                <TabsTrigger value="auto">Palabras Automáticas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-4">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <textarea
                    value={newWord}
                    onChange={handleInputChange}
                    onPaste={handlePaste}
                    placeholder="Ingresa palabras (separadas por comas o nuevas líneas)"
                    className="flex-grow p-2 border rounded-md resize-y min-h-[100px]"
                  />
                  <Button onClick={addWords} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="auto" className="space-y-4">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-center">
                  <div className="flex items-center space-x-2 flex-grow">
                    <span>Cantidad:</span>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={wordCount}
                      onChange={(e) => setWordCount(parseInt(e.target.value) || 5)}
                      className="w-20"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={generateRandomWords} 
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      {isLoading ? 'Generando...' : 'Generar Palabras'}
                    </Button>
                    <Button 
                      onClick={clearWords} 
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reiniciar
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2">
              {words.map((word, index) => (
                <span key={index} className={`px-2 py-1 rounded flex items-center text-white ${getWordColor(word)}`}>
                  {word}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 p-0 h-auto text-white"
                    onClick={() => removeWord(word)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </span>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button 
                onClick={generateGrid} 
                disabled={words.length === 0} 
                className="w-full sm:flex-grow"
              >
                Generar Sopa de Letras
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span className="text-lg font-semibold">{formatTime(time)}</span>
              </div>
              <div className="flex space-x-2">
                <Button onClick={getHint} variant="outline">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Pista
                </Button>
                <Button onClick={resetGame} variant="outline" className="text-red-500">
                  Reiniciar
                </Button>
              </div>
            </div>
            <div 
              ref={gridRef}
              className="grid gap-1" 
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
              onMouseLeave={() => setIsSelecting(false)}
            >
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <Button
                    key={`${rowIndex}-${colIndex}`}
                    variant={selection.includes(rowIndex * gridSize + colIndex) ? "default" : "outline"}
                    className={`w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm font-bold
                      ${foundWords.some(word => isCellInWord(rowIndex, colIndex, word)) 
                        ? `text-white ${getWordColor(foundWords.find(word => isCellInWord(rowIndex, colIndex, word)) || '')}`
                        : ''}
                      ${hintCell && hintCell.row === rowIndex && hintCell.col === colIndex ? 'bg-yellow-300' : ''}
                    `}
                    onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                    onMouseUp={handleCellMouseUp}
                  >
                    {cell}
                  </Button>
                ))
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {words.map((word, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded text-sm ${
                    foundWords.includes(word)
                      ? `text-white ${getWordColor(word)}`
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
            {allFound && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>¡Felicidades!</AlertTitle>
                <AlertDescription>
                  Has encontrado todas las palabras en {formatTime(time)}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}