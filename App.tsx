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
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

type Group = {
  id: string;
  name: string;
  activities: string[];
};

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // Migrate old flat activities format into a default group
        const oldStored = await AsyncStorage.getItem('activities');
        if (oldStored) {
          const parsed = JSON.parse(oldStored);
          if (Array.isArray(parsed) && parsed.every((i: unknown) => typeof i === 'string')) {
            const migrated: Group = {
              id: Date.now().toString(),
              name: 'My List',
              activities: parsed as string[],
            };
            const newGroups = [migrated];
            await AsyncStorage.setItem('groups', JSON.stringify(newGroups));
            await AsyncStorage.removeItem('activities');
            setGroups(newGroups);
            setActiveGroupId(migrated.id);
            return;
          }
        }

        const stored = await AsyncStorage.getItem('groups');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setGroups(parsed);
            if (parsed.length > 0) setActiveGroupId(parsed[0].id);
          }
        }
      } catch {
        // Storage unavailable, start fresh
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('groups', JSON.stringify(groups)).catch(() => {});
  }, [groups, isLoaded]);

  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null;

  const openDrawer = () => {
    drawerAnim.setValue(-DRAWER_WIDTH);
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  const selectGroup = (id: string) => {
    setActiveGroupId(id);
    setResult(null);
    closeDrawer();
  };

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const newGroup: Group = { id: Date.now().toString(), name, activities: [] };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    setNewGroupName('');
    setResult(null);
    closeDrawer();
  };

  const deleteGroup = (id: string) => {
    setGroups(prev => {
      const updated = prev.filter(g => g.id !== id);
      if (activeGroupId === id) {
        setActiveGroupId(updated.length > 0 ? updated[0].id : null);
        setResult(null);
      }
      return updated;
    });
  };

  const addActivity = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !activeGroup || activeGroup.activities.includes(trimmed)) return;
    setGroups(prev =>
      prev.map(g =>
        g.id === activeGroupId ? { ...g, activities: [...g.activities, trimmed] } : g
      )
    );
    setInputText('');
  };

  const removeActivity = (item: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.id === activeGroupId
          ? { ...g, activities: g.activities.filter(a => a !== item) }
          : g
      )
    );
  };

  const spin = () => {
    if (!activeGroup || activeGroup.activities.length === 0 || isSpinning) return;
    const snapshot = activeGroup.activities;

    setIsSpinning(true);
    let count = 0;
    const maxCount = 20;

    const tick = () => {
      setResult(snapshot[Math.floor(Math.random() * snapshot.length)]);
      count++;
      if (count < maxCount) {
        spinTimeoutRef.current = setTimeout(tick, 80);
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

  const activities = activeGroup?.activities ?? [];
  const canSpin = activities.length > 0 && !isSpinning;

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={openDrawer}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={styles.burgerIcon}>
            <View style={styles.burgerLine} />
            <View style={styles.burgerLine} />
            <View style={styles.burgerLine} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeGroup ? activeGroup.name : 'Roulette'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subtitle}>Stop overthinking, let chance decide</Text>

      {activeGroup ? (
        <>
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
                placeholder="Add an option..."
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
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <View style={styles.activityItem}>
                <Text style={styles.activityText}>{item}</Text>
                <TouchableOpacity
                  onPress={() => removeActivity(item)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.removeText}>x</Text>
                </TouchableOpacity>
              </View>
            )}
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Add some options above to get started</Text>
            }
          />
        </>
      ) : (
        <View style={styles.noGroupContainer}>
          <Text style={styles.emptyText}>Open the menu to create your first list</Text>
        </View>
      )}

      <View style={styles.rouletteSection}>
        {result ? (
          <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.resultLabel}>
              {isSpinning ? 'Choosing...' : 'Your pick:'}
            </Text>
            <Text style={styles.resultText}>{result}</Text>
          </Animated.View>
        ) : (
          <View style={styles.resultPlaceholder}>
            <Text style={styles.placeholderText}>Your pick will appear here</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.spinButton, !canSpin && styles.spinButtonDisabled]}
          onPress={spin}
          disabled={!canSpin}
          activeOpacity={0.8}
        >
          <Text style={styles.spinButtonText}>
            {isSpinning ? 'Spinning...' : 'SPIN'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={styles.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
            <SafeAreaView style={{ flex: 1 }}>
              <Text style={styles.drawerTitle}>My Lists</Text>
              <FlatList
                data={groups}
                keyExtractor={(g) => g.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.drawerItem,
                      item.id === activeGroupId && styles.drawerItemActive,
                    ]}
                    onPress={() => selectGroup(item.id)}
                  >
                    <Text
                      style={[
                        styles.drawerItemText,
                        item.id === activeGroupId && styles.drawerItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteGroup(item.id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={styles.drawerDeleteText}>x</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.drawerEmptyText}>No lists yet</Text>
                }
              />
              <View style={styles.drawerInputRow}>
                <TextInput
                  style={styles.drawerInput}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  onSubmitEditing={createGroup}
                  placeholder="New list name..."
                  placeholderTextColor="#475569"
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.addButton} onPress={createGroup}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  burgerIcon: {
    width: 32,
    gap: 5,
    paddingVertical: 4,
  },
  burgerLine: {
    height: 2,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  noGroupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    paddingHorizontal: 20,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 20,
    marginBottom: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  drawerItemActive: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  drawerItemText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 16,
  },
  drawerItemTextActive: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  drawerDeleteText: {
    color: '#475569',
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerEmptyText: {
    color: '#334155',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  drawerInputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  drawerInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
});
