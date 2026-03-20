import React, { useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, Linking } from 'react-native';
import {
  Card,
  Text,
  Chip,
  IconButton,
  useTheme,
  ActivityIndicator,
  Divider,
  Button,
} from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';

import { useDocs } from '../hooks/useApi';
import { useStore } from '../store';

const STATUS_CONFIG = {
  submitted: { icon: 'check-circle', color: '#3FB950', label: 'Submitted' },
  approved: { icon: 'shield-check', color: '#58A6FF', label: 'Approved' },
  draft: { icon: 'pencil-outline', color: '#D29922', label: 'Draft' },
  rejected: { icon: 'close-circle', color: '#F85149', label: 'Rejected' },
};

function DocCard({ doc, theme }) {
  const status = STATUS_CONFIG[doc.submission_status] || STATUS_CONFIG.draft;
  const apiBaseUrl = useStore.getState().apiBaseUrl;

  const handlePreview = () => {
    if (doc.preview_url) {
      Linking.openURL(doc.preview_url);
    }
  };

  const handleDownload = () => {
    const downloadUrl = doc.download_url || `${apiBaseUrl}/docs/${doc.id}/download`;
    Linking.openURL(downloadUrl);
  };

  return (
    <Card style={[styles.docCard, { backgroundColor: theme.colors.surface }]} mode="contained">
      <Card.Content>
        <View style={styles.docHeader}>
          <View style={styles.docTitleWrap}>
            <IconButton
              icon="file-document-outline"
              iconColor={theme.colors.primary}
              size={20}
              style={styles.docIcon}
            />
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}
              numberOfLines={2}
            >
              {doc.title || 'Untitled Document'}
            </Text>
          </View>
          <Chip
            icon={status.icon}
            style={[styles.statusChip, { backgroundColor: status.color + '18' }]}
            textStyle={{ color: status.color, fontSize: 10, fontWeight: '700' }}
          >
            {status.label}
          </Chip>
        </View>

        {doc.description && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 18 }}
            numberOfLines={3}
          >
            {doc.description}
          </Text>
        )}

        {doc.source_links?.length > 0 && (
          <>
            <Divider style={{ backgroundColor: theme.colors.outline, marginVertical: 10 }} />
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Source Traceability
            </Text>
            {doc.source_links.map((link, idx) => (
              <View key={idx} style={styles.sourceLink}>
                <IconButton
                  icon="link-variant"
                  iconColor={theme.colors.primary}
                  size={14}
                  style={styles.linkIcon}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.primary, flex: 1 }}
                  numberOfLines={1}
                  onPress={() => link.url && Linking.openURL(link.url)}
                >
                  {link.title || link.url || `Source ${idx + 1}`}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.docActions}>
          <Button
            mode="text"
            icon="eye-outline"
            onPress={handlePreview}
            compact
            labelStyle={{ fontSize: 12 }}
          >
            Preview
          </Button>
          <Button
            mode="text"
            icon="download-outline"
            onPress={handleDownload}
            compact
            labelStyle={{ fontSize: 12 }}
          >
            Download
          </Button>
        </View>

        <Text variant="labelSmall" style={{ color: theme.colors.textMuted, marginTop: 4 }}>
          {doc.completed_at
            ? `Completed ${new Date(doc.completed_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}`
            : 'Completion date pending'}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function DocsScreen() {
  const theme = useTheme();
  const { data: docs, isLoading, refetch } = useDocs();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !docs) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const docsList = docs || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {docsList.length === 0 ? (
        <View style={styles.emptyState}>
          <IconButton icon="file-document-outline" iconColor={theme.colors.onSurfaceVariant} size={48} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            No completed documents yet
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.textMuted, marginTop: 4 }}>
            Documents will appear here once jobs are completed
          </Text>
        </View>
      ) : (
        <FlashList
          data={docsList}
          renderItem={({ item }) => <DocCard doc={item} theme={theme} />}
          estimatedItemSize={180}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
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
  listContent: { padding: 16 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  docCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  docTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  docIcon: { margin: 0, marginRight: 6 },
  statusChip: { height: 26 },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  linkIcon: { margin: 0, marginRight: 2, padding: 0 },
  docActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 10,
  },
});
