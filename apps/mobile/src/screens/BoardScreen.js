import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Dimensions,
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  useTheme,
  ActivityIndicator,
  Badge,
  IconButton,
} from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import { useJobs } from '../hooks/useApi';
import { useStore } from '../store';

const COLUMNS = [
  { key: 'new', label: 'New', icon: 'plus-circle-outline' },
  { key: 'triaged', label: 'Triaged', icon: 'sort-variant' },
  { key: 'in_progress', label: 'In Progress', icon: 'progress-wrench' },
  { key: 'awaiting_verification', label: 'Awaiting Verify', icon: 'eye-check-outline' },
  { key: 'verification_failed', label: 'Failed', icon: 'alert-outline' },
  { key: 'completed', label: 'Completed', icon: 'check-circle-outline' },
];

const SOURCES = ['jira', 'confluence', 'github', 'email', 'slack'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

const SOURCE_ICONS = {
  jira: 'jira',
  confluence: 'book-open-variant',
  github: 'github',
  email: 'email-outline',
  slack: 'slack',
};

const PRIORITY_COLORS = {
  critical: '#F85149',
  high: '#F0883E',
  medium: '#D29922',
  low: '#8B949E',
};

function JobCard({ job, theme, onPress }) {
  const priorityColor = PRIORITY_COLORS[job.priority] || theme.colors.onSurfaceVariant;

  return (
    <Pressable onPress={onPress}>
      <Card
        style={[styles.jobCard, { backgroundColor: theme.colors.surfaceVariant }]}
        mode="contained"
      >
        <Card.Content style={styles.jobCardContent}>
          <View style={styles.jobCardHeader}>
            <IconButton
              icon={SOURCE_ICONS[job.source] || 'file-outline'}
              iconColor={theme.colors.onSurfaceVariant}
              size={16}
              style={styles.sourceIcon}
            />
            <View
              style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}
            >
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {job.priority?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurface, fontWeight: '600' }}
            numberOfLines={2}
          >
            {job.title}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
          >
            {job.created_at
              ? new Date(job.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'No date'}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

function KanbanColumn({ column, jobs, theme, onCardPress }) {
  const columnJobs = jobs.filter((j) => j.status === column.key);
  const screenWidth = Dimensions.get('window').width;
  const columnWidth = screenWidth * 0.72;

  return (
    <View style={[styles.column, { width: columnWidth }]}>
      <View style={styles.columnHeader}>
        <View style={styles.columnTitleRow}>
          <IconButton
            icon={column.icon}
            iconColor={theme.colors.primary}
            size={18}
            style={styles.columnIcon}
          />
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
            {column.label}
          </Text>
        </View>
        <Badge
          size={22}
          style={[styles.columnBadge, { backgroundColor: theme.colors.primaryContainer }]}
        >
          {columnJobs.length}
        </Badge>
      </View>

      <View style={styles.columnList}>
        {columnJobs.length > 0 ? (
          <FlashList
            data={columnJobs}
            renderItem={({ item }) => (
              <JobCard
                job={item}
                theme={theme}
                onPress={() => onCardPress(item)}
              />
            )}
            estimatedItemSize={100}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyColumn}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}
            >
              No jobs
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function BoardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { data: jobs, isLoading, refetch } = useJobs();
  const { filters, setFilter, clearFilters } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredJobs = (jobs || []).filter((job) => {
    if (filters.source && job.source !== filters.source) return false;
    if (filters.priority && job.priority !== filters.priority) return false;
    return true;
  });

  const handleCardPress = (job) => {
    navigation.navigate('TaskDetail', { jobId: job.id });
  };

  if (isLoading && !jobs) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Chip
            mode={filters.source || filters.priority ? 'flat' : 'outlined'}
            onPress={clearFilters}
            style={styles.filterChip}
            textStyle={styles.filterChipText}
            icon="filter-off"
          >
            All
          </Chip>
          {SOURCES.map((source) => (
            <Chip
              key={source}
              mode={filters.source === source ? 'flat' : 'outlined'}
              selected={filters.source === source}
              onPress={() =>
                setFilter('source', filters.source === source ? null : source)
              }
              style={styles.filterChip}
              textStyle={styles.filterChipText}
              icon={SOURCE_ICONS[source] || 'help-circle-outline'}
            >
              {source.charAt(0).toUpperCase() + source.slice(1)}
            </Chip>
          ))}
          {PRIORITIES.map((priority) => (
            <Chip
              key={priority}
              mode={filters.priority === priority ? 'flat' : 'outlined'}
              selected={filters.priority === priority}
              onPress={() =>
                setFilter('priority', filters.priority === priority ? null : priority)
              }
              style={[
                styles.filterChip,
                filters.priority === priority && {
                  backgroundColor: PRIORITY_COLORS[priority] + '25',
                },
              ]}
              textStyle={[
                styles.filterChipText,
                filters.priority === priority && { color: PRIORITY_COLORS[priority] },
              ]}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kanbanScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            jobs={filteredJobs}
            theme={theme}
            onCardPress={handleCardPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filtersContainer: {
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    height: 34,
  },
  filterChipText: {
    fontSize: 12,
  },
  kanbanScroll: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  column: {
    marginHorizontal: 6,
    flex: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  columnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnIcon: { margin: 0, marginRight: 2 },
  columnBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  columnList: {
    flex: 1,
    minHeight: 200,
  },
  jobCard: {
    marginBottom: 8,
    borderRadius: 10,
  },
  jobCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceIcon: { margin: 0, padding: 0 },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyColumn: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
