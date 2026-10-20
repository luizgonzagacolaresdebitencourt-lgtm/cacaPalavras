import React, { useState, useEffect } from 'react';
import {
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Alert, AsyncStorage } from 'react-native';
import { WordleGame } from './src/GameScreen';

// Word lists by category (Portuguese and English)
const wordLists = {
  animals: {
    pt: ['cavalo', 'gato', 'cachorro', 'elefante', 'tigre', 'leao', 'girafa'],
    en: ['horse', 'cat', 'dog', 'elephant', 'tiger', 'lion', 'giraffe'],
  },
  countries: {
    pt: ['brasil', 'argentina', 'canada', 'australia', 'japao', 'eua'],
    en: ['brazil', 'argentina', 'canada', 'australia', 'japan', 'usa'],
  },
  fruits: {
    pt: ['maçã', 'banana', 'laranja', 'uva', 'abacate', 'manga', 'kiwi'],
    en: ['apple', 'banana', 'orange', 'grape', 'avocado', 'mango', 'kiwi'],
  },
  default: {
    pt: ['casa', 'music', 'train', 'plane', 'mesa', 'lamp', 'relogio'],
    en: ['house', 'music', 'train', 'plane', 'table', 'lamp', 'clock'],
  },
};

const Stack = createStackNavigator();

const HomeScreen = ({ navigation, route }) => {
  const [selectedCategory, setSelectedCategory] = useState<'animals' | 'countries' | 'fruits' | 'default'>('default');
  const [selectedLanguage, setSelectedLanguage] = useState<'pt' | 'en'>('pt');

  const startNewGame = () => {
    const category = selectedCategory;
    const language = selectedLanguage;
    const wordList = wordLists[category][language];
    const randomWord =
      wordList[Math.floor(Math.random() * wordList.length)];
    navigation.navigate('Game', { word: randomWord, category, language });
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Selecionar Categoria</Text>
        {[
          { label: 'Animais', value: 'animals' },
          { label: 'Países', value: 'countries' },
          { label: 'Frutas', value: 'fruits' },
          { label: 'Aleatória', value: 'default' },
        ].map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.categoryOpt, selectedCategory === opt.value && styles.categoryOptActive]}
            onPress={() => setSelectedCategory(opt.value)}
          >
            <Text style={styles.categoryOptText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section} marginTop={20}>
        <Text style={styles.sectionTitle}>Selecionar Idioma</Text>
        <View style={styles.languageOptions}>
          <TouchableOpacity
            style={[
              styles.languageOption,
              selectedLanguage === 'pt' && styles.languageOptionActive,
            ]}
            onPress={() => setSelectedLanguage('pt')}
          >
            <Text style={styles.languageOptionText}>Português</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageOption,
              selectedLanguage === 'en' && styles.languageOptionActive,
            ]}
            onPress={() => setSelectedLanguage('en')}
          >
            <Text style={styles.languageOptionText}>English</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section} marginTop={30}>
        <TouchableOpacity style={styles.startButton} onPress={startNewGame}>
          <Text style={styles.startButtonText}>Iniciar Jogo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const GameScreen = ({ route }) => {
  return <WordleGame />;
};

const StatsScreen = () => {
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    maxStreak: 0,
    averageGuesses: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stored = await AsyncStorage.getItem('cacapalavras_stats');
        if (stored) {
          setStats(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load stats', e);
      }
    };
    loadStats();
  }, []);

  const updateStats = (won: boolean, guesses: number) => {
    setStats((prev) => {
      const gamesPlayed = prev.gamesPlayed + 1;
      const wins = prev.wins + (won ? 1 : 0);
      const losses = prev.losses + (won ? 0 : 1);
      const currentStreak = won ? (prev.currentStreak + 1) : 0;
      const maxStreak = Math.max(prev.maxStreak, currentStreak);
      const averageGuesses = (
        (prev.averageGuesses * (prev.gamesPlayed || 1) + guesses) /
        gamesPlayed
      ).toFixed(1);

      return {
        gamesPlayed,
        wins,
        losses,
        currentStreak,
        maxStreak,
        averageGuesses: parseFloat(averageGuesses),
      };
    });

    try {
      await AsyncStorage.setItem(
        'cacapalavras_stats',
        JSON.stringify(stats)
      );
    } catch (e) {
      console.error('Failed to save stats', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estatísticas</Text>
      <View style={styles.statsGrid}>
        <View style={statsItem}>
          <Text style={statsLabel}>Jogos Jogados</Text>
          <Text style={statsValue}>{stats.gamesPlayed}</Text>
        </View>
        <View style={statsItem}>
          <Text style={statsLabel}>Vitórias</Text>
          <Text style={statsValue}>{stats.wins}</Text>
        </View>
        <View style={statsItem}>
          <Text style={statsLabel}>Derrotas</Text>
          <Text style={statsValue}>{stats.losses}</Text>
        </View>
        <View style={statsItem}>
          <Text style={statsLabel}> sequência Atual</Text>
          <Text style={statsValue}>{stats.currentStreak}</Text>
        </View>
        <View style={statsItem}>
          <Text style={statsLabel}>Máxima sequência</Text>
          <Text style={statsValue}>{stats.maxStreak}</Text>
        </View>
        <View style={statsItem}>
          <Text style={statsLabel}>Média de Tentativas</Text>
          <Text style={statsValue}>{stats.averageGuesses}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={() => {
        AsyncStorage.removeItem('cacapalavras_stats');
        setStats({
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          currentStreak: 0,
          maxStreak: 0,
          averageGuesses: 0,
        });
      }}>
        <Text style={styles.resetButtonText}>Reiniciar Estatísticas</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#8B0000',
  },
  categoryOpt: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginRight: 5,
    marginBottom: 5,
  },
  categoryOptActive: {
    backgroundColor: '#8B0000',
  },
  categoryOptText: {
    color: '#333',
    fontWeight: 'bold',
  },
  languageOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  languageOption: {
    padding: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginHorizontal: 5,
  },
  languageOptionActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  languageOptionText: {
    color: '#333',
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#8B0000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statsItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    minWidth: '45%',
    marginBottom: 10,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resetButton: {
    backgroundColor: '#8B0000',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
  },
});