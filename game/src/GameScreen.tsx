import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  StyleSheet,
  Alert,
  AsyncStorage,
  Platform,
  Appearance,
  Sharing,
  Clipboard,
} from 'react-native';
import { useColorScheme } from 'react-native';

// Types for game state
type LetterState = 'empty' | 'correct' | 'present' | 'absent';
type GameStatus = 'playing' | 'won' | 'lost';

interface LetterBoxProps {
  letter: string;
  state: LetterState;
  onPress?: () => void;
}

const letterColors: Record<LetterState, string> = {
  empty: 'transparent',
  correct: '#C8E67C',
  present: '#FFD93D',
  absent: '#AEAEB2',
};

const useWordleGame = (initialWord?: string, category?: string, language?: string) => {
  const [word, setWord] = useState<string>('');
  const [attempts, setAttempts] = useState<number[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [usedLetters, setUsedLetters] = useState<Record<string, LetterState>>({});
  const [history, setHistory] = useState<Array<string[]>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'default');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language || 'pt');

  const storeAccess = Platform.OS === 'android' ? 'android_storage' : 'ios_storage';

  useEffect(() => {
    const loadGame = async () => {
      try {
        const stored = await AsyncStorage.getItem(storeAccess);
        if (stored) {
          const parsed = JSON.parse(stored);
          setWord(parsed.word || '');
          setAttempts(parsed.attempts || []);
          setCurrentGuess(parsed.currentGuess || '');
          setMessage(parsed.message || '');
          setStatus(parsed.status || 'playing');
          setUsedLetters(parsed.usedLetters || {});
          setHistory(parsed.history || []);
          setSelectedCategory(parsed.category || 'default');
          setSelectedLanguage(parsed.language || 'pt');
        }
      } catch (e) {
        console.error('Failed to load game state', e);
      }
    };
    loadGame();
  }, [storeAccess]);

  useEffect(() => {
    const saveGame = async () => {
      try {
        const state = {
          word,
          attempts: attempts.length > 0 ? attempts : [],
          currentGuess,
          message,
          status,
          usedLetters,
          history: history.length > 0 ? history : [],
          category: selectedCategory,
          language: selectedLanguage,
        };
        await AsyncStorage.setItem(storeAccess, JSON.stringify(state));
      } catch (e) {
        console.error('Failed to save game state', e);
      }
    };
    saveGame();
  }, [word, attempts, currentGuess, message, status, usedLetters, history, selectedCategory, selectedLanguage]);

  const handleKeyPress = async (letter: string) => {
    if (status !== 'playing') return;

    if (currentGuess.length >= 5) return;

    const upperLetter = letter.toUpperCase();
    setCurrentGuess(currentGuess + upperLetter);
  };

const handleSubmit = async () => {
    if (currentGuess.length !== 5 || status !== 'playing') return;

    // Check if word is valid (simplified - in real app would check against word list)
    const isValidWord = true; // placeholder

    if (!isValidWord) {
      setMessage('Palavra inválida');
      return;
    }

    const newAttempt = currentGuess.toLowerCase();
    const targetWord = word.toLowerCase();
    const newAttempts = [...attempts, newAttempt];
    const newHistoryRow = evaluateGuess(newAttempt, targetWord);
    setHistory(prev => [...prev, newHistoryRow]);

    // Update letter states
    const updatedUsedLetters = { ...usedLetters };

    for (let i = 0; i < 5; i++) {
      const letter = newAttempt[i];
      const targetLetter = targetWord[i];
      const isCorrectPosition = letter === targetLetter;

      if (isCorrectPosition) {
        updatedUsedLetters[letter] = 'correct';
      } else if (targetWord.includes(letter)) {
        // Check if we already marked it as correct
        if (updatedUsedLetters[letter] !== 'correct') {
          updatedUsedLetters[letter] = 'present';
        }
      } else {
        // Letter is not in word at all - only mark as absent if not already marked as correct/present
        if (
          updatedUsedLetters[letter] !== 'correct' &&
          updatedUsedLetters[letter] !== 'present'
        ) {
          updatedUsedLetters[letter] = 'absent';
        }
      }
    }

    setUsedLetters(updatedUsedLetters);

    // Check win condition
    const allCorrect = newAttempt.split('').every((letter, index) =>
      letter === targetWord[index]
    );

    if (allCorrect) {
      setStatus('won');
      setMessage('Parabéns! Você venceu!');
      await saveStats(true);
      await shareResults();
      return;
    }

    // Check lose condition (6 attempts)
    if (newAttempts.length >= 6) {
      setStatus('lost');
      setMessage(`Game over! A palavra era: ${word}`);
      await saveStats(false);
      return;
    }

    setCurrentGuess('');
    setMessage('');
  };

  const evaluateGuess = (guess: string, target: string) => {
    const result: string[] = [];
    const targetLetters = target.split('');

    // First pass: mark correct positions
    const guessArray = guess.split('');
    const targetUsed = new Set<number>();

    for (let i = 0; i < 5; i++) {
      if (guessArray[i] === target[i]) {
        result.push('correct');
        targetUsed.add(i);
      } else {
        result.push(''); // placeholder, will be filled in second pass
      }
    }

    // Second pass: mark present/absent
    const letterCounts: Record<string, number> = {};
    for (const letter of target) {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;

    // Decrease counts for correct positions
    for (const idx of targetUsed) {
      letterCounts[target[idx]] = (letterCounts[target[idx]] || 0) - 1;
    }

    for (let i = 0; i < 5; i++) {
      if (result[i] === '') {
        const letter = guessArray[i];
        if (letterCounts[letter] > 0) {
          result[i] = 'present';
          letterCounts[letter]--;
        } else {
          result[i] = 'abscent';
        }
      }
    }

    return result;
  };

  const handleBackspace = () => {
    setCurrentGuess(currentGuess.slice(0, -1));
  };

const resetGame = async (newWord?: string) => {
    setWord(newWord || getRandomWord());
    setAttempts([]);
    setCurrentGuess('');
    setMessage('');
    setStatus('playing');
    setUsedLetters({});
    setHistory([]);
    await saveStatsUndefined();
  };

  const saveStats = async (won: boolean) => {
    try {
      const statsKey = Platform.OS === 'android' ? 'android_stats' : 'ios_stats';
      const existingStats = await AsyncStorage.getItem(statsKey);
      const stats = existingStats ? JSON.parse(existingStats) : {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0,
        maxStreak: 0,
        averageGuesses: 0,
      };

      stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
      stats.wins = stats.wins + (won ? 1 : 0);
      stats.losses = stats.losses + (won ? 0 : 1);

      // Update streak
      if (won) {
        stats.currentStreak = (stats.currentStreak || 0) + 1;
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
      } else {
        stats.currentStreak = 0;
      }

      // Update average guesses
      const totalGuesses = (stats.averageGuesses * (stats.gamesPlayed - 1) || 0) + (currentGuess.length ? currentGuess.split('').length : 0);
      stats.averageGuesses = Number(((totalGuesses / stats.gamesPlayed) || 0).toFixed(1));

      await AsyncStorage.setItem(statsKey, JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save stats', e);
    }
  };

  const generateShareText = () => {
    const emojiMap: Record<LetterState, string> = {
      correct: '🟩',
      present: '🟨',
      absent: '⬜',
      empty: '⬜',
    };

    let text = 'CacaPalavras\n\n';

    // Show attempts grid
    const attemptsCount = Math.max(6, (history.length || 0) + 1);
    for (let i = 0; i < attemptsCount; i++) {
      if (i < (history.length || 0)) {
        const row = history[i] || [];
        const rowEmojis = row.map((state) => emojiMap[state as LetterState] || '⬜').join('');
        text += rowEmojis + '\n';
      } else {
        text += '⬜⬜⬜⬜⬜' + '\n';
      }
    }

    text += '\n';
    text += `Palavra: ${word.toLowerCase()}\n`;
    text += `Tentativas: ${attempts.length}\n`;
    text += `Categoria: ${selectedCategory}\n`;
    text += `Idioma: ${selectedLanguage}\n`;

    return text;
  };

  const shareResults = async () => {
    const shareText = generateShareText();
    try {
      const result = await Sharing.share({
        message: shareText,
        title: 'CacaPalavras - Resultado',
      });
      if (result.action === Sharing.Action.CANCELED) {
        // Fallback to clipboard
        await Clipboard.setString(shareText);
        Alert.alert('Copiado', 'Resultado copiado para a área de transferência');
      }
    } catch (e) {
      // Fallback: copy to clipboard
      try {
        await Clipboard.setString(shareText);
        Alert.alert('Copiado', 'Resultado copiado para a área de transferência');
      } catch (err) {
        Alert.alert('Erro', 'Não foi possível compartilhar o resultado');
      }
    }
  };

  const saveStatsUndefined = async () => {
    // Save without win/loss for continuous play
    try {
      const state = {
        word,
        attempts: attempts.length > 0 ? attempts : [],
        currentGuess,
        message,
        status,
        usedLetters,
        history: history.length > 0 ? history : [],
        category: selectedCategory,
        language: selectedLanguage,
      };
      await AsyncStorage.setItem(storeAccess, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save game state', e);
    }
  };

  const getRandomWord = () => {
    const categoryData = wordLists[selectedCategory as keyof typeof wordLists] || wordLists.default;
    const wordList = categoryData[selectedLanguage as keyof typeof categoryData] || categoryData.pt;

    // Daily mode: use date to generate consistent word index
    const today = new Date();
    const dayIndex = today.getDate() + today.getMonth() * 31 + today.getFullYear() * 365;
    const wordIndex = Math.abs(dayIndex) % wordList.length;

    return wordList[wordIndex];
  };

  return {
    word,
    attempts,
    currentGuess,
    message,
    status,
    usedLetters,
    history,
    selectedCategory,
    selectedLanguage,
    setWord,
    setAttempts,
    setCurrentGuess,
    setMessage,
    setStatus,
    setUsedLetters,
    setHistory,
    setSelectedCategory,
    setSelectedLanguage,
    handleKeyPress,
    handleSubmit,
    handleBackspace,
    resetGame,
    getRandomWord,
  };
};

export const WordleGame = ({ route }) => {
  const colorScheme = useColorScheme();
  const prefersContrast = Appearance.getPreferencesAsync().then(
    (prefs) => prefs.contains('prefer-contrast')
  );

  const game = useWordleGame(route.params.word, route.params.category, route.params.language);

  const keys = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ];

  const categoryOptions = [
    { label: 'Animais', value: 'animals' },
    { label: 'Países', value: 'countries' },
    { label: 'Frutas', value: 'fruits' },
    { label: 'Aleatória', value: 'default' },
  ];

  return (
    <KeyboardAvoidingView
      style styles.container
      behavior="padding"
      keyboardHack={Platform.OS === 'ios'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>CacaPalavras</Text>
        <Text style={styles.subtitle}>Adivinhe a palavra de 5 letras</Text>
      </View>

      <View style={styles.categorySelector}>
        <Text style={styles.categoryLabel}>Categoria:</Text>
        {categoryOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.categoryButton, game.selectedCategory === opt.value && styles.categoryButtonActive]}
            onPress={() => game.setSelectedCategory(opt.value)}
          >
            <Text style={styles.categoryButtonText}>
              {opt.label}{game.selectedCategory === opt.value && ' ✓'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.categoryButton, game.selectedLanguage === 'pt' && styles.categoryButtonActive]}
          onPress={() => game.setSelectedLanguage('pt')}
        >
          <Text style={styles.categoryButtonText}>
            Pt
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryButton, game.selectedLanguage === 'en' && styles.categoryButtonActive]}
          onPress={() => game.setSelectedLanguage('en')}
        >
          <Text style={styles.categoryButtonText}>
            En
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gameArea}>
        {/* Top - Current row being typed */}
        <View style={styles.currentRow}>
          {game.currentGuess.split('').map((letter, index) => (
            <View key={index} style={styles.letterBox}>
              <Text style={[styles.letterText, { color: letterColors[game.usedLetters[letter] as LetterState] || 'black' }]}>{letter}</Text>
            </View>
          ))}
          {/* Fill remaining empty boxes */}
          {Array(5 - game.currentGuess.length).fill(0).map((_, i) => (
            <View key={game.currentGuess.length + i} style={styles.letterBoxEmpty}>
              <Text style={styles.letterTextEmpty}>.</Text>
            </View>
          ))}
        </View>

        {/* Previous attempts */}
        {game.history.map((row, index) => (
          <View key={index} style={styles.row}>
            {row.map((letterState, i) => (
              <View
                key={i}
                style={[
                  styles.letterBox,
                  { backgroundColor: letterColors[letterState as LetterState] },
                ]}
              >
                <Text style={styles.letterText}>{game.attempts[index]?.[i] || ''}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Keyboard */}
        <View style={styles.keyboard}>
          {keys.map((letter) => (
            <TouchableOpacity
              key={letter}
              style={styles.key}
              onPress={() => game.handleKeyPress(letter)}
            >
              <Text style={styles.keyText}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.button} onPress={() => game.handleSubmit()}>
          <Text style={styles.buttonText}>ENTER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => game.handleBackspace()}>
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
      </View>

      {game.status !== 'playing' && (
        <View style={styles.resultOverlay}>
          <Text style={styles.resultText}>
            {game.status === 'won' ? 'VOCÊ GANHOU!' : 'GAME OVER'}
          </Text>
          <Text style={styles.resultMessage}>{game.message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => game.resetGame()}>
            <Text style={styles.buttonText}>Jogar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#8B0000',
    color: 'white',
    textAlign: 'center',
    borderRadius: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.9,
    marginTop: 5,
  },
  categorySelector: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoryLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ddd',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#8B0000',
    color: 'white',
  },
  categoryButtonText: {
    fontSize: 12,
  },
  gameArea: {
    flex: 1,
    padding: 20,
  },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  letterBox: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  letterBoxEmpty: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  keyboard: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  key: {
    width: 40,
    height: 40,
    backgroundColor: '#eee',
    borderRadius: 6,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  button: {
    width: 50,
    height: 50,
    backgroundColor: '#8B0000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultMessage: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
});