import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  Divider,
  useTheme,
  ActivityIndicator,
  IconButton,
  Surface,
  ProgressBar,
} from 'react-native-paper';
import Markdown from 'react-native-markdown-display';

import { useJob, useJobAction } from '../hooks/useApi';

const STATUS_STEPS = [
  { key: 'queued', label: 'Queued', icon: 'clock-outline' },
  { key: 'gathering', label: 'Gathering', icon: 'download-outline' },
  { key: 'drafting', label: 'Drafting', icon: 'pencil-outline' },
  { key: 'verifying', label: 'Verifying', icon: 'shield-check-outline' },
  { key: 'completed', label: 'Done', icon: 'check-circle-outline' },
];

function StepIndicator({ steps, currentStatus, theme }) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);

  return (
    <View style={styles.stepsRow}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const color = isCompleted
          ? theme.colors.success
          : isCurrent
          ? theme.colors.primary
          : theme.colors.onSurfaceVariant;

        return (
          <View key={step.key} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: isCompleted || isCurrent ? color + '20' : 'transparent',
                  borderColor: color,
                },
              ]}
            >
              <IconButton icon={step.icon} iconColor={color} size={16} style={styles.stepIcon} />
            </View>
            <Text
              variant="labelSmall"
              style={{ color, textAlign: 'center', fontSize: 10 }}
            >
              {step.label}
            </Text>
            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  { backgroundColor: isCompleted ? theme.colors.success : theme.colors.outline },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function TaskDetailScreen({ route }) {
  const { jobId } = route.params;
  const theme = useTheme();
  const { data: job, isLoading } = useJob(jobId);
  const { approve, reject, rerun, archive } = useJobAction();

  const markdownStyles = {
    body: { color: theme.colors.onSurface, fontSize: 14, lineHeight: 22 },
    heading1: { color: theme.colors.onSurface, fontSize: 22, fontWeight: '700' },
    heading2: { color: theme.colors.onSurface, fontSize: 18, fontWeight: '700' },
    heading3: { color: theme.colors.onSurface, fontSize: 16, fontWeight: '600' },
    code_inline: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.primary,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
    fence: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.onSurface,
      borderRadius: 8,
      padding: 12,
    },
    link: { color: theme.colors.primary },
    blockquote: {
      borderLeftColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: 12,
      borderRadius: 4,
    },
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <IconButton icon="alert-circle-outline" iconColor={theme.colors.error} size={48} />
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Job not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {job.title}
        </Text>
        <View style={styles.metaRow}>
          <Chip icon="tag-outline" style={styles.metaChip} textStyle={styles.metaChipText}>
            {job.source || 'Unknown'}
          </Chip>
          <Chip icon="flag-outline" style={styles.metaChip} textStyle={styles.metaChipText}>
            {job.priority || 'Normal'}
          </Chip>
          <Chip icon="clock-outline" style={styles.metaChip} textStyle={styles.metaChipText}>
            {job.status?.replace(/_/g, ' ') || 'Unknown'}
          </Chip>
        </View>
      </Surface>

      {job.source_references?.length > 0 && (
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Source References
          </Text>
          {job.source_references.map((ref, idx) => (
            <View key={idx} style={styles.refRow}>
              <IconButton
                icon="link-variant"
                iconColor={theme.colors.primary}
                size={16}
                style={styles.refIcon}
              />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.primary, flex: 1 }}
                numberOfLines={1}
              >
                {ref.url || ref.title || `Reference ${idx + 1}`}
              </Text>
            </View>
          ))}
        </Surface>
      )}

      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Agent Execution
        </Text>
        <StepIndicator steps={STATUS_STEPS} currentStatus={job.agent_status || job.status} theme={theme} />
        {job.agent_progress != null && (
          <View style={styles.progressWrap}>
            <ProgressBar
              progress={job.agent_progress / 100}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {job.agent_progress}% complete
            </Text>
          </View>
        )}
      </Surface>

      {job.evidence_pack && (
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Evidence Pack
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
            {typeof job.evidence_pack === 'string'
              ? job.evidence_pack
              : `${Object.keys(job.evidence_pack).length} evidence items collected`}
          </Text>
        </Surface>
      )}

      {job.draft_content && (
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Draft Preview
          </Text>
          <Divider style={{ backgroundColor: theme.colors.outline, marginBottom: 12 }} />
          <Markdown style={markdownStyles}>{job.draft_content}</Markdown>
        </Surface>
      )}

      <View style={styles.actionsSection}>
        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            icon="check"
            onPress={() => approve.mutate(jobId)}
            loading={approve.isPending}
            style={[styles.actionBtn, { backgroundColor: theme.colors.success + 'DD' }]}
            labelStyle={{ color: '#FFF' }}
          >
            Approve
          </Button>
          <Button
            mode="contained"
            icon="close"
            onPress={() => reject.mutate(jobId)}
            loading={reject.isPending}
            style={[styles.actionBtn, { backgroundColor: theme.colors.error + 'DD' }]}
            labelStyle={{ color: '#FFF' }}
          >
            Reject
          </Button>
        </View>
        <View style={styles.actionsRow}>
          <Button
            mode="outlined"
            icon="refresh"
            onPress={() => rerun.mutate(jobId)}
            loading={rerun.isPending}
            style={styles.actionBtn}
            textColor={theme.colors.warning}
          >
            Re-run
          </Button>
          <Button
            mode="outlined"
            icon="archive-outline"
            onPress={() => archive.mutate(jobId)}
            loading={archive.isPending}
            style={styles.actionBtn}
            textColor={theme.colors.onSurfaceVariant}
          >
            Archive
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaChip: { height: 30 },
  metaChipText: { fontSize: 11 },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  refIcon: { margin: 0, marginRight: 4 },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepDot: {
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  stepIcon: { margin: 0 },
  stepConnector: {
    position: 'absolute',
    top: 18,
    left: '60%',
    right: '-40%',
    height: 2,
    zIndex: -1,
  },
  progressWrap: {
    marginTop: 12,
    gap: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  actionsSection: {
    gap: 10,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
  },
});
