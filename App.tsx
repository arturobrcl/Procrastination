import React, { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [activities, setActivities] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isLoaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('activities').then(stored => {
      if (stored) setActivities(JSON.parse(stored));
      isLoaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!isLoaded.current) return;
    AsyncStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  const addActivity = () => {
    const trimmed = inputText.trim();
    if (!trimmed || activities.includes(trimmed)) return;
    setActivities(prev => [...prev, trimmed]);
    setInputText('');
  };

  const removeActivity = (index: number) => {
    setActivities(prev => prev.filter((_, i) => i !== index));
  };

  const spin = () => {
    if (activities.length === 0 || isSpinning) return;

    setIsSpinning(true);
    let count = 0;
    const maxCount = 20;

    const tick = () => {
      setResult(activities[Math.floor(Math.random() * activities.length)]);
      count++;
      if (count < maxCount) {
        setTimeout(tick, 60 + (count / maxCount) * 220);
      } else {
        setIsSpinning(false);
        scaleAnim.setValue(0.7);
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }).start();
      }
    };

    tick();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>Roulette</Text>
      <Text style={styles.subtitle}>Stop overthinking, start doing</Text>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputSection}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={addActivity}
            placeholder="Add an activity..."
            placeholderTextColor="#475569"
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={addActivity}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <FlatList
        data={activities}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>{item}</Text>
            <TouchableOpacity
              onPress={() => removeActivity(index)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.removeText}>x</Text>
            </TouchableOpacity>
          </View>
        )}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Add some activities above to get started</Text>
        }
      />

      <View style={styles.rouletteSection}>
        {result ? (
          <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.resultLabel}>
              {isSpinning ? 'Choosing...' : 'Go do this:'}
            </Text>
            <Text style={styles.resultText}>{result}</Text>
          </Animated.View>
        ) : (
          <View style={styles.resultPlaceholder}>
            <Text style={styles.placeholderText}>Your activity will appear here</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.spinButton,
            (activities.length === 0 || isSpinning) && styles.spinButtonDisabled,
          ]}
          onPress={spin}
          disabled={activities.length === 0 || isSpinning}
          activeOpacity={0.8}
        >
          <Text style={styles.spinButtonText}>
            {isSpinning ? 'Spinning...' : 'SPIN'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  inputSection: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f1f5f9',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 30,
  },
  list: {
    flex: 1,
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityText: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 16,
  },
  removeText: {
    color: '#475569',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#334155',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
  rouletteSection: {
    paddingBottom: 24,
    alignItems: 'center',
    gap: 16,
  },
  resultCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  resultLabel: {
    color: '#6366f1',
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  resultText: {
    color: '#f1f5f9',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultPlaceholder: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#1e293b',
    minHeight: 104,
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#334155',
    fontSize: 15,
    textAlign: 'center',
  },
  spinButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
    elevation: 8,
  },
  spinButtonDisabled: {
    backgroundColor: '#1e293b',
    elevation: 0,
  },
  spinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
