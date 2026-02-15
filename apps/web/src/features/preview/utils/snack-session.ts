import { Snack, SnackFiles, SDKVersion } from "snack-sdk";

import type { SnackSessionConfig, SnackDependencies } from "../types";

const DEFAULT_SDK_VERSION: SDKVersion = "54.0.0";

const DEFAULT_APP_CODE = `import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

// ============ LOCK SCREEN ============
function LockScreen({ onUnlock }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [isCompatible, setIsCompatible] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsCompatible(compatible);

      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        }

        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          setError('No biometrics enrolled on this device');
        }
      }
    } catch (err) {
      setError('Failed to check biometric support');
    }
  };

  const authenticate = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access SecureVault',
        subtitle: 'Use biometrics to unlock your vault',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onUnlock();
      } else {
        if (result.error === 'user_cancel') {
          setError('Authentication cancelled');
        } else if (result.error === 'user_fallback') {
          setError('Fallback authentication not implemented');
        } else {
          setError('Authentication failed. Please try again.');
        }
      }
    } catch (err) {
      setError('An error occurred during authentication');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === 'face') return '👤';
    if (biometricType === 'fingerprint') return '👆';
    return '🔐';
  };

  const getBiometricLabel = () => {
    if (biometricType === 'face') return 'Face ID';
    if (biometricType === 'fingerprint') return 'Touch ID';
    return 'Biometric';
  };

  return (
    <View style={styles.lockScreen}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1e293b', '#334155']} style={styles.lockGradient}>
        <View style={styles.lockIconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        <Text style={styles.lockTitle}>SecureVault</Text>
        <Text style={styles.lockSubtitle}>Your passwords are protected</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.unlockButton, isAuthenticating && styles.unlockButtonDisabled]}
          onPress={authenticate}
          disabled={isAuthenticating || !isCompatible}
        >
          {isAuthenticating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
              <Text style={styles.unlockButtonText}>
                Unlock with {getBiometricLabel()}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!isCompatible && (
          <Text style={styles.notSupportedText}>
            Biometric authentication not available on this device
          </Text>
        )}

        <View style={styles.securityBadge}>
          <Text style={styles.securityIcon}>🛡️</Text>
          <Text style={styles.securityText}>256-bit AES Encryption</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ============ VAULT SCREEN (Protected Content) ============
function VaultScreen({ onLock }) {
  const [passwords, setPasswords] = useState([
    { id: 1, name: 'Gmail Account', username: 'john.doe@gmail.com', category: 'email' },
    { id: 2, name: 'Netflix', username: 'johndoe', category: 'streaming' },
    { id: 3, name: 'Bank of America', username: '****4521', category: 'finance' },
    { id: 4, name: 'GitHub', username: 'johndoe-dev', category: 'development' },
    { id: 5, name: 'Amazon', username: 'john.doe@gmail.com', category: 'shopping' },
  ]);

  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { key: 'all', label: 'All', icon: '📁' },
    { key: 'email', label: 'Email', icon: '📧' },
    { key: 'finance', label: 'Finance', icon: '🏦' },
    { key: 'streaming', label: 'Streaming', icon: '🎬' },
    { key: 'development', label: 'Dev', icon: '💻' },
    { key: 'shopping', label: 'Shopping', icon: '🛒' },
  ];

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.key === category);
    return cat ? cat.icon : '🔑';
  };

  const filteredPasswords = selectedCategory === 'all'
    ? passwords
    : passwords.filter(p => p.category === selectedCategory);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={['#059669', '#10b981']} style={styles.vaultHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.vaultTitle}>🔓 Vault Unlocked</Text>
            <Text style={styles.vaultSubtitle}>{passwords.length} passwords stored</Text>
          </View>
          <TouchableOpacity style={styles.lockButton} onPress={onLock}>
            <Text style={styles.lockButtonText}>🔒 Lock</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, selectedCategory === cat.key && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryLabel, selectedCategory === cat.key && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.passwordList}>
        {filteredPasswords.map(item => (
          <TouchableOpacity key={item.id} style={styles.passwordCard}>
            <View style={styles.passwordIcon}>
              <Text style={styles.passwordIconText}>{getCategoryIcon(item.category)}</Text>
            </View>
            <View style={styles.passwordInfo}>
              <Text style={styles.passwordName}>{item.name}</Text>
              <Text style={styles.passwordUsername}>{item.username}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton}>
              <Text style={styles.copyButtonText}>📋</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addPasswordButton}>
          <Text style={styles.addPasswordIcon}>+</Text>
          <Text style={styles.addPasswordText}>Add New Password</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ============ SETTINGS SCREEN ============
function SettingsScreen({ biometricEnabled, onToggleBiometric, onLock }) {
  const [autoLock, setAutoLock] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <View style={styles.screen}>
      <View style={styles.settingsHeader}>
        <Text style={styles.settingsTitle}>Security Settings</Text>
      </View>

      <ScrollView style={styles.settingsContent}>
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Authentication</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>👆</Text>
              <View>
                <Text style={styles.settingLabel}>Biometric Unlock</Text>
                <Text style={styles.settingDescription}>Use Face ID or Touch ID</Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={onToggleBiometric}
              trackColor={{ true: '#059669' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>⏱️</Text>
              <View>
                <Text style={styles.settingLabel}>Auto-Lock</Text>
                <Text style={styles.settingDescription}>Lock after 1 minute of inactivity</Text>
              </View>
            </View>
            <Switch
              value={autoLock}
              onValueChange={setAutoLock}
              trackColor={{ true: '#059669' }}
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={styles.settingLabel}>Security Alerts</Text>
                <Text style={styles.settingDescription}>Get notified of suspicious activity</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: '#059669' }}
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Data</Text>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>📤</Text>
              <Text style={styles.settingLabel}>Export Passwords</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🗑️</Text>
              <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Delete All Data</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.lockVaultButton} onPress={onLock}>
          <Text style={styles.lockVaultText}>🔒 Lock Vault Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState('vault');
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setActiveTab('vault');
  };

  if (!isUnlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <View style={styles.container}>
      {activeTab === 'vault' ? (
        <VaultScreen onLock={handleLock} />
      ) : (
        <SettingsScreen
          biometricEnabled={biometricEnabled}
          onToggleBiometric={setBiometricEnabled}
          onLock={handleLock}
        />
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'vault' && styles.tabItemActive]}
          onPress={() => setActiveTab('vault')}
        >
          <Text style={styles.tabIcon}>🔐</Text>
          <Text style={[styles.tabLabel, activeTab === 'vault' && styles.tabLabelActive]}>Vault</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  lockScreen: { flex: 1 },
  lockGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  lockIcon: { fontSize: 50 },
  lockTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  lockSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 40 },
  errorContainer: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginBottom: 20 },
  errorText: { color: '#fca5a5', fontSize: 14, textAlign: 'center' },
  unlockButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, gap: 12 },
  unlockButtonDisabled: { opacity: 0.7 },
  biometricIcon: { fontSize: 24 },
  unlockButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  notSupportedText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 20, textAlign: 'center' },
  securityBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 60, gap: 8 },
  securityIcon: { fontSize: 16 },
  securityText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  vaultHeader: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vaultTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  vaultSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  lockButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  lockButtonText: { color: '#fff', fontWeight: '600' },
  categoryContainer: { paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, gap: 6 },
  categoryChipActive: { backgroundColor: '#059669' },
  categoryIcon: { fontSize: 16 },
  categoryLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  categoryLabelActive: { color: '#fff' },
  passwordList: { flex: 1, padding: 16 },
  passwordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  passwordIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  passwordIconText: { fontSize: 24 },
  passwordInfo: { flex: 1, marginLeft: 12 },
  passwordName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  passwordUsername: { fontSize: 14, color: '#64748b', marginTop: 2 },
  copyButton: { padding: 8 },
  copyButtonText: { fontSize: 20 },
  addPasswordButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 8, marginBottom: 20, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', gap: 8 },
  addPasswordIcon: { fontSize: 24, color: '#059669' },
  addPasswordText: { fontSize: 16, color: '#059669', fontWeight: '600' },
  settingsHeader: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#fff' },
  settingsTitle: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  settingsContent: { flex: 1 },
  settingsSection: { backgroundColor: '#fff', marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 12, marginTop: 16, textTransform: 'uppercase' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  settingIcon: { fontSize: 20 },
  settingLabel: { fontSize: 16, color: '#1e293b' },
  settingDescription: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  settingArrow: { fontSize: 24, color: '#94a3b8' },
  lockVaultButton: { margin: 20, backgroundColor: '#1e293b', padding: 16, borderRadius: 12, alignItems: 'center' },
  lockVaultText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: 20, paddingTop: 12 },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabItemActive: {},
  tabIcon: { fontSize: 24 },
  tabLabel: { fontSize: 12, color: '#94a3b8' },
  tabLabelActive: { color: '#059669', fontWeight: '600' },
});
`;

const DEFAULT_FILES: SnackFiles = {
  "App.js": {
    type: "CODE",
    contents: DEFAULT_APP_CODE,
  },
};

const DEFAULT_DEPENDENCIES: SnackDependencies = {
  "expo-status-bar": { version: "*" },
  "expo-linear-gradient": { version: "*" },
  "expo-local-authentication": { version: "*" },
};

export function createSnackSession(config: SnackSessionConfig = {}): Snack {
  const {
    name = "Staq Preview",
    description = "AI-generated mobile app preview",
    sdkVersion = DEFAULT_SDK_VERSION,
    files = DEFAULT_FILES,
    dependencies = DEFAULT_DEPENDENCIES,
    webPreviewRef,
  } = config;

  return new Snack({
    name,
    description,
    sdkVersion: sdkVersion as SDKVersion,
    files,
    dependencies,
    codeChangesDelay: 500,
    online: true,
    webPreviewRef,
  });
}

export function getSnackWebPreviewURL(snack: Snack): string | null {
  const state = snack.getState();
  return state.webPreviewURL || null;
}

export function getSnackQRCodeURL(snack: Snack): string | null {
  const state = snack.getState();
  return state.url || null;
}

export function formatSnackError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

export { DEFAULT_SDK_VERSION, DEFAULT_FILES, DEFAULT_DEPENDENCIES };
