import React, { useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import {
  Text,
  IconButton,
  useTheme,
  ActivityIndicator,
  Surface,
  Divider,
} from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';

import { useNotifications } from '../hooks/useApi';

const NOTIFICATION_CONFIG = {
  job_discovered: {
    icon: 'plus-circle-outline',
    color: '#58A6FF',
    label: 'New Job',
  },
  run_failed: {
    icon: 'alert-circle-outline',
    color: '#F85149',
    label: 'Run Failed',
  },
  verification_returned: {
    icon: 'undo-variant',
    color: '#D29922',
    label: 'Verifier Return',
  },
  job_completed: {
    icon: 'check-circle-outline',
    color: '#3FB950',
    label: 'Completed',
  },
  connector_error: {
    icon: 'power-plug-off-outline',
    color: '#F0883E',
    label: 'Connector Error',
  },
};

function getNotifConfig(type) {
  return (
    NOTIFICATION_CONFIG[type] || {
      icon: 'bell-outline',
      color: '#8B949E',
      label: 'Notification',
    }
  );
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationItem({ notification, theme }) {
  const config = getNotifConfig(notification.type);
  const isUnread = !notification.read;

  return (
    <Surface
      style={[
        styles.notifItem,
        {
          backgroundColor: isUnread
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
        },
      ]}
      elevation={0}
    >
      <View style={styles.notifRow}>
        <View
          style={[styles.notifIconWrap, { backgroundColor: config.color + '18' }]}
        >
          <IconButton
            icon={config.icon}
            iconColor={config.color}
            size={20}
            style={styles.notifIcon}
          />
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifHeaderRow}>
            <Text
              variant="labelSmall"
              style={[styles.notifLabel, { color: config.color }]}
            >
              {config.label}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.textMuted }}>
              {formatTimeAgo(notification.created_at)}
            </Text>
          </View>

          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.onSurface,
              fontWeight: isUnread ? '600' : '400',
            }}
            numberOfLines={2}
          >
            {notification.title || notification.message}
          </Text>

          {notification.details && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 }}
              numberOfLines={2}
            >
              {notification.details}
            </Text>
          )}
        </View>

        {isUnread && (
          <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
        )}
      </View>
    </Surface>
  );
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !notifications) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const notifList = notifications || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {notifList.length === 0 ? (
        <View style={styles.emptyState}>
          <IconButton
            icon="bell-off-outline"
            iconColor={theme.colors.onSurfaceVariant}
            size={48}
          />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            No notifications
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.textMuted, marginTop: 4 }}
          >
            You'll be notified when new events occur
          </Text>
        </View>
      ) : (
        <FlashList
          data={notifList}
          renderItem={({ item }) => (
            <NotificationItem notification={item} theme={theme} />
          )}
          estimatedItemSize={90}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <Divider style={{ backgroundColor: theme.colors.outline, marginHorizontal: 16 }} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 8 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notifItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notifIconWrap: {
    borderRadius: 20,
    marginRight: 12,
  },
  notifIcon: { margin: 0 },
  notifContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifLabel: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 6,
  },
});
