import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Switch,
  IconButton,
  useTheme,
  Surface,
  Divider,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useConnectors, useHealth } from '../hooks/useApi';

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`
);

function HealthIndicator({ status, label, theme }) {
  const isHealthy = status === 'healthy' || status === 'connected';
  const color = isHealthy ? theme.colors.success : theme.colors.error;

  return (
    <View style={styles.healthRow}>
      <View style={[styles.healthDot, { backgroundColor: color }]} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
        {label}
      </Text>
      <Text variant="labelSmall" style={{ color, fontWeight: '600' }}>
        {status || 'unknown'}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();

  const themeMode = useStore((s) => s.themeMode);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const apiBaseUrl = useStore((s) => s.apiBaseUrl);
  const setApiBaseUrl = useStore((s) => s.setApiBaseUrl);
  const standupDeliveryTime = useStore((s) => s.standupDeliveryTime);
  const setStandupDeliveryTime = useStore((s) => s.setStandupDeliveryTime);
  const whatsappNumber = useStore((s) => s.whatsappNumber);
  const setWhatsappNumber = useStore((s) => s.setWhatsappNumber);

  const { data: connectors, isLoading: connectorsLoading } = useConnectors();
  const { data: health, isLoading: healthLoading } = useHealth();

  const [localUrl, setLocalUrl] = useState(apiBaseUrl);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [selectedHourIndex, setSelectedHourIndex] = useState(
    HOURS.indexOf(standupDeliveryTime) >= 0 ? HOURS.indexOf(standupDeliveryTime) : 9
  );

  const handleSaveUrl = useCallback(() => {
    setApiBaseUrl(localUrl.trim());
  }, [localUrl, setApiBaseUrl]);

  const connectorList = connectors?.items || connectors || [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Settings
        </Text>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Appearance
          </Text>
          <Divider style={{ backgroundColor: theme.colors.border, marginBottom: 12 }} />
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                Dark Mode
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.textSecondary }}>
                {themeMode === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
              </Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={toggleTheme}
              color={theme.colors.primary}
            />
          </View>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Standup Delivery
          </Text>
          <Divider style={{ backgroundColor: theme.colors.border, marginBottom: 12 }} />
          <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
            Select when you'd like to receive your daily standup
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeRow}
          >
            {HOURS.map((h, i) => {
              const isSelected = h === standupDeliveryTime;
              return (
                <Button
                  key={h}
                  mode={isSelected ? 'contained' : 'text'}
                  compact
                  onPress={() => setStandupDeliveryTime(h)}
                  style={[
                    styles.timeChip,
                    isSelected && { backgroundColor: theme.colors.primary },
                  ]}
                  labelStyle={{
                    fontSize: 12,
                    color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                  }}
                >
                  {h}
                </Button>
              );
            })}
          </ScrollView>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            WhatsApp
          </Text>
          <Divider style={{ backgroundColor: theme.colors.border, marginBottom: 12 }} />
          <TextInput
            mode="outlined"
            label="WhatsApp Number"
            placeholder="+1 (555) 000-0000"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="whatsapp" />}
            outlineStyle={{ borderColor: theme.colors.border }}
            style={{ backgroundColor: theme.colors.surfaceVariant }}
          />
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Connector Health
          </Text>
          <Divider style={{ backgroundColor: theme.colors.border, marginBottom: 12 }} />
          {connectorsLoading ? (
            <ActivityIndicator size="small" />
          ) : connectorList.length > 0 ? (
            connectorList.map((c, i) => (
              <HealthIndicator
                key={c.id || i}
                label={c.name || c.type}
                status={c.status}
                theme={theme}
              />
            ))
          ) : (
            <Text variant="bodySmall" style={{ color: theme.colors.textMuted }}>
              No connectors configured
            </Text>
          )}

          {health && (
            <>
              <Divider style={{ backgroundColor: theme.colors.border, marginVertical: 12 }} />
              <HealthIndicator label="API Server" status={health.status} theme={theme} />
              {health.database && (
                <HealthIndicator label="Database" status={health.database} theme={theme} />
              )}
              {health.redis && (
                <HealthIndicator label="Redis" status={health.redis} theme={theme} />
              )}
            </>
          )}
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            API Server
          </Text>
          <Divider style={{ backgroundColor: theme.colors.border, marginBottom: 12 }} />
          <TextInput
            mode="outlined"
            label="Base URL"
            value={localUrl}
            onChangeText={setLocalUrl}
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="server" />}
            outlineStyle={{ borderColor: theme.colors.border }}
            style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: 12 }}
          />
          <Button
            mode="contained"
            onPress={handleSaveUrl}
            style={{ borderRadius: 12, backgroundColor: theme.colors.primary }}
            labelStyle={{ fontWeight: '600' }}
          >
            Save URL
          </Button>
        </Surface>

        <Text variant="labelSmall" style={[styles.version, { color: theme.colors.textMuted }]}>
          Erwin OS Mobile v1.0.0 · Expo SDK 52
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 16 },
  section: { borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    gap: 6,
    paddingVertical: 4,
  },
  timeChip: {
    borderRadius: 10,
    minWidth: 56,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  version: {
    textAlign: 'center',
    marginTop: 8,
  },
});
