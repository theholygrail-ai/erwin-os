import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  ActivityIndicator,
  useTheme,
  Divider,
  Surface,
} from 'react-native-paper';
import { Audio } from 'expo-av';

import { useStandup, useJobs, useStandupAudioUrl } from '../hooks/useApi';

function StatCard({ icon, label, value, color, theme }) {
  return (
    <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content style={styles.statContent}>
        <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
          <IconButton icon={icon} iconColor={color} size={22} style={styles.statIcon} />
        </View>
        <Text variant="headlineMedium" style={[styles.statValue, { color }]}>
          {value}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { data: standup, isLoading: standupLoading, refetch: refetchStandup } = useStandup();
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useJobs();
  const audioUrl = useStandupAudioUrl();

  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeJobs = jobs?.filter?.((j) => !['completed', 'archived'].includes(j.status)) || [];
  const overdueJobs = jobs?.filter?.((j) => j.is_overdue) || [];
  const failedJobs = jobs?.filter?.((j) => j.status === 'verification_failed') || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStandup(), refetchJobs()]);
    setRefreshing(false);
  }, [refetchStandup, refetchJobs]);

  const playStandupAudio = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  };

  React.useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  if (standupLoading && jobsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <Surface style={[styles.standupCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
        <View style={styles.standupHeader}>
          <View style={styles.standupTitleRow}>
            <IconButton
              icon="microphone"
              iconColor={theme.colors.primary}
              size={20}
              style={styles.standupMic}
            />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              Today's Standup
            </Text>
          </View>
          <IconButton
            icon={isPlaying ? 'pause-circle' : 'play-circle'}
            iconColor={theme.colors.primary}
            size={32}
            onPress={playStandupAudio}
          />
        </View>
        <Divider style={{ backgroundColor: theme.colors.outline, marginVertical: 8 }} />
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}
          numberOfLines={6}
        >
          {standup?.summary || 'No standup summary available for today. Check back after the morning sync.'}
        </Text>
      </Surface>

      <View style={styles.statsRow}>
        <StatCard
          icon="briefcase-outline"
          label="Active Jobs"
          value={activeJobs.length}
          color={theme.colors.primary}
          theme={theme}
        />
        <StatCard
          icon="alert-circle-outline"
          label="Overdue"
          value={overdueJobs.length}
          color={theme.colors.warning}
          theme={theme}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          icon="close-circle-outline"
          label="Verification Failed"
          value={failedJobs.length}
          color={theme.colors.error}
          theme={theme}
        />
        <StatCard
          icon="check-circle-outline"
          label="Completed Today"
          value={jobs?.filter?.((j) => j.status === 'completed')?.length || 0}
          color={theme.colors.success}
          theme={theme}
        />
      </View>

      <View style={styles.quickActions}>
        <Button
          mode="contained"
          icon="refresh"
          onPress={onRefresh}
          style={[styles.actionButton, { backgroundColor: theme.colors.primaryContainer }]}
          labelStyle={{ color: theme.colors.onPrimaryContainer }}
        >
          Refresh Board
        </Button>
        <Button
          mode="contained"
          icon={isPlaying ? 'pause' : 'play'}
          onPress={playStandupAudio}
          style={[styles.actionButton, { backgroundColor: theme.colors.secondaryContainer }]}
          labelStyle={{ color: theme.colors.onSecondaryContainer }}
        >
          {isPlaying ? 'Pause Audio' : 'Play Standup'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  standupCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  standupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  standupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  standupMic: { margin: 0, marginRight: 4 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statIconWrap: {
    borderRadius: 20,
    marginBottom: 8,
  },
  statIcon: { margin: 0 },
  statValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
  },
});
