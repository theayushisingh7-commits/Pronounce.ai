import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Mic, MicOff, Volume2, RefreshCw, History, Trophy, Activity, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Check for Web Speech API support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

export default function PronunciationCoach() {
  const [sentence, setSentence] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [activeTab, setActiveTab] = useState("practice");
  
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      toast.error("Speech recognition not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSpokenText(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      if (event.error === "no-speech") {
        toast.error("No speech detected. Please try again.");
      } else if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow microphone access.");
      } else {
        toast.error(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Fetch initial sentence
  useEffect(() => {
    fetchSentence();
    fetchAttempts();
    fetchStats();
  }, []);

  const fetchSentence = async (diff = difficulty) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/sentences?difficulty=${diff}`);
      setSentence(response.data.sentence);
      setSpokenText("");
      setComparisonResult(null);
    } catch (error) {
      console.error("Error fetching sentence:", error);
      toast.error("Failed to fetch sentence");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttempts = async () => {
    try {
      const response = await axios.get(`${API}/attempts`);
      setAttempts(response.data);
    } catch (error) {
      console.error("Error fetching attempts:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const startRecording = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast.error("Speech recognition not supported");
      return;
    }

    setSpokenText("");
    setComparisonResult(null);
    setIsRecording(true);
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const compareTexts = useCallback(async () => {
    if (!spokenText || !sentence) return;

    const originalWords = sentence.toLowerCase().replace(/[.,!?]/g, "").split(/\s+/);
    const spokenWords = spokenText.toLowerCase().replace(/[.,!?]/g, "").split(/\s+/);

    const results = [];
    const incorrectWords = [];
    let correctCount = 0;

    originalWords.forEach((word, index) => {
      const spoken = spokenWords[index] || "";
      const isCorrect = word === spoken;
      
      if (isCorrect) {
        correctCount++;
      } else {
        incorrectWords.push({
          expected: word,
          spoken: spoken || "(missing)",
          index
        });
      }

      results.push({
        original: word,
        spoken: spoken || "(missing)",
        isCorrect
      });
    });

    const score = (correctCount / originalWords.length) * 100;
    
    const comparison = {
      results,
      incorrectWords,
      correctCount,
      totalWords: originalWords.length,
      score
    };

    setComparisonResult(comparison);

    // Play first incorrect word pronunciation
    if (incorrectWords.length > 0) {
      setTimeout(() => {
        speakWord(incorrectWords[0].expected);
      }, 500);
    }

    // Save attempt to database
    try {
      await axios.post(`${API}/attempts`, {
        sentence,
        spoken_text: spokenText,
        difficulty,
        correct_words: correctCount,
        total_words: originalWords.length,
        score,
        incorrect_words: incorrectWords
      });
      fetchAttempts();
      fetchStats();
    } catch (error) {
      console.error("Error saving attempt:", error);
    }
  }, [spokenText, sentence, difficulty]);

  // Auto-compare when spoken text changes
  useEffect(() => {
    if (spokenText && sentence) {
      compareTexts();
    }
  }, [spokenText, sentence, compareTexts]);

  const speakWord = (word) => {
    if (!speechSynthesis) {
      toast.error("Speech synthesis not supported");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const handleDifficultyChange = (value) => {
    setDifficulty(value);
    fetchSentence(value);
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case "easy": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "hard": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center neon-glow">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-gradient" data-testid="app-title">
                  AI Pronunciation Coach
                </h1>
                <p className="text-xs text-zinc-500">Master your English pronunciation</p>
              </div>
            </div>
            
            {stats && (
              <div className="hidden sm:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">{stats.total_attempts}</p>
                  <p className="text-xs text-zinc-500">Attempts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{stats.average_score}%</p>
                  <p className="text-xs text-zinc-500">Avg Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-violet-400">{stats.best_score}%</p>
                  <p className="text-xs text-zinc-500">Best</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
            <TabsTrigger 
              value="practice" 
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              data-testid="practice-tab"
            >
              <Mic className="w-4 h-4 mr-2" />
              Practice
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              data-testid="history-tab"
            >
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Practice Tab */}
          <TabsContent value="practice" className="space-y-8 fade-in">
            {/* Browser Support Warning */}
            {!speechSupported && (
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">
                    Speech recognition is not supported in this browser. Please use Chrome or Edge.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Difficulty Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm text-zinc-400">Difficulty:</label>
                <Select value={difficulty} onValueChange={handleDifficultyChange}>
                  <SelectTrigger 
                    className="w-40 bg-zinc-900 border-zinc-700"
                    data-testid="difficulty-selector"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="easy" data-testid="difficulty-easy">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Easy
                      </span>
                    </SelectItem>
                    <SelectItem value="medium" data-testid="difficulty-medium">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="hard" data-testid="difficulty-hard">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Hard
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSentence()}
                disabled={isLoading}
                className="border-zinc-700 hover:bg-zinc-800 btn-press"
                data-testid="new-sentence-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                New Sentence
              </Button>
            </div>

            {/* Main Practice Card */}
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
              <CardHeader className="border-b border-zinc-800 pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-zinc-300">Read this sentence:</CardTitle>
                  <Badge className={getDifficultyColor(difficulty)}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Sentence Display */}
                <div 
                  className="text-2xl md:text-3xl font-heading leading-relaxed text-center py-8 px-4 rounded-xl bg-zinc-800/50 border border-zinc-700"
                  data-testid="sentence-display"
                >
                  {isLoading ? (
                    <span className="text-zinc-500">Loading...</span>
                  ) : comparisonResult ? (
                    <span className="flex flex-wrap justify-center gap-2">
                      {comparisonResult.results.map((word, index) => (
                        <span
                          key={index}
                          className={word.isCorrect ? "text-green-400" : "text-red-400 line-through decoration-2"}
                          data-testid={`word-${index}-${word.isCorrect ? 'correct' : 'incorrect'}`}
                        >
                          {sentence.split(/\s+/)[index]}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-zinc-100">{sentence}</span>
                  )}
                </div>

                {/* Recording Button */}
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!speechSupported}
                    className={`
                      w-24 h-24 rounded-full flex items-center justify-center
                      transition-all duration-300 btn-press focus-ring
                      ${isRecording 
                        ? "bg-red-500 text-white recording-pulse scale-110" 
                        : "bg-cyan-500 hover:bg-cyan-400 text-white neon-glow-strong hover:scale-105"
                      }
                      ${!speechSupported ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                    aria-label={isRecording ? "Stop recording" : "Start recording"}
                    data-testid="recording-btn"
                  >
                    {isRecording ? (
                      <MicOff className="w-10 h-10" />
                    ) : (
                      <Mic className="w-10 h-10" />
                    )}
                  </button>
                  <p className="text-sm text-zinc-400">
                    {isRecording ? "Listening... Click to stop" : "Click to start recording"}
                  </p>
                </div>

                {/* Spoken Text Display */}
                {spokenText && (
                  <div className="slide-up">
                    <p className="text-sm text-zinc-500 mb-2">You said:</p>
                    <div 
                      className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 text-lg text-zinc-300"
                      data-testid="spoken-text-display"
                    >
                      "{spokenText}"
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feedback Panel */}
            {comparisonResult && (
              <Card className="bg-zinc-900/50 border-zinc-800 slide-up" data-testid="feedback-panel">
                <CardHeader className="border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Your Score
                    </CardTitle>
                    <div className="text-3xl font-bold">
                      <span className={comparisonResult.score >= 70 ? "text-green-400" : comparisonResult.score >= 40 ? "text-yellow-400" : "text-red-400"}>
                        {Math.round(comparisonResult.score)}%
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Accuracy</span>
                      <span className="text-zinc-300">
                        {comparisonResult.correctCount} / {comparisonResult.totalWords} words correct
                      </span>
                    </div>
                    <Progress 
                      value={comparisonResult.score} 
                      className="h-3 bg-zinc-800"
                      data-testid="score-progress"
                    />
                  </div>

                  {/* Incorrect Words Feedback */}
                  {comparisonResult.incorrectWords.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-zinc-400">Words to practice:</h3>
                      <div className="grid gap-3">
                        {comparisonResult.incorrectWords.map((item, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
                            data-testid={`incorrect-word-${index}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-red-400 line-through">{item.spoken}</span>
                                <ChevronRight className="w-4 h-4 text-zinc-500" />
                                <span className="text-green-400 font-medium">{item.expected}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => speakWord(item.expected)}
                              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 btn-press"
                              aria-label={`Hear correct pronunciation of ${item.expected}`}
                              data-testid={`play-pronunciation-${index}`}
                            >
                              <Volume2 className="w-4 h-4 mr-2" />
                              Hear Correct
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparisonResult.incorrectWords.length === 0 && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-xl font-medium text-green-400">Perfect!</p>
                      <p className="text-zinc-500">You pronounced every word correctly.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-semibold">Practice History</h2>
              {attempts.length > 0 && (
                <p className="text-sm text-zinc-500">{attempts.length} attempts recorded</p>
              )}
            </div>

            {attempts.length === 0 ? (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <History className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No practice attempts yet.</p>
                  <p className="text-zinc-500 text-sm mt-2">Start practicing to see your history here.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attempts.map((attempt, index) => (
                    <Card 
                      key={attempt.id || index}
                      className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
                      data-testid={`history-item-${index}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className={getDifficultyColor(attempt.difficulty)}>
                            {attempt.difficulty}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {formatDate(attempt.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-zinc-400 line-clamp-2">
                          {attempt.sentence}
                        </p>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <span className="text-sm text-zinc-500">
                            {attempt.correct_words}/{attempt.total_words} words
                          </span>
                          <span className={`text-lg font-bold ${
                            attempt.score >= 70 ? "text-green-400" : 
                            attempt.score >= 40 ? "text-yellow-400" : "text-red-400"
                          }`}>
                            {Math.round(attempt.score)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Stats Summary */}
            {stats && stats.total_attempts > 0 && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-cyan-400">{stats.total_attempts}</p>
                      <p className="text-sm text-zinc-500">Total Attempts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-400">{stats.average_score}%</p>
                      <p className="text-sm text-zinc-500">Average Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-violet-400">{stats.best_score}%</p>
                      <p className="text-sm text-zinc-500">Best Score</p>
                    </div>
                    <div className="text-center">
                      <div className="flex justify-center gap-2 text-sm">
                        <span className="text-green-400">{stats.attempts_by_difficulty?.easy || 0}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-yellow-400">{stats.attempts_by_difficulty?.medium || 0}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-red-400">{stats.attempts_by_difficulty?.hard || 0}</span>
                      </div>
                      <p className="text-sm text-zinc-500">Easy / Medium / Hard</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-zinc-600">
            AI Pronunciation Coach — Practice makes perfect
          </p>
        </div>
      </footer>
    </div>
  );
}
