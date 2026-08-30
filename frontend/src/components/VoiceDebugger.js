import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/theme';
import { startNativeVoiceRecognition, stopNativeVoiceRecognition } from '../services/api/localLLMService';

/**
 * VoiceDebugger Component
 * 
 * Use this to diagnose voice recognition issues
 * 
 * Usage:
 * import VoiceDebugger from './VoiceDebugger';
 * 
 * <VoiceDebugger />
 */
export const VoiceDebugger = () => {
  const theme = useTheme();
  const [logs, setLogs] = useState(['Initializing...']);
  const [isListening, setIsListening] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);

  const addLog = useCallback(message => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  useEffect(() => {
    addLog('Component mounted');
    if (Platform.OS !== 'android') {
      addLog('❌ Native speech recognition is Android-only');
      setVoiceReady(false);
      return;
    }
    setVoiceReady(true);
    addLog('✅ Native speech recognition available');
  }, [addLog]);

  const testVoiceStart = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        addLog('❌ Microphone permission denied');
        return;
      }
      addLog('🔄 Starting voice recognition...');
      setIsListening(true);
      const text = await startNativeVoiceRecognition();
      setIsListening(false);
      addLog(`📝 Result: ${text || '(empty)'}`);
    } catch (error) {
      addLog(`❌ Start failed: ${error.message}`);
      setIsListening(false);
    }
  };

  const testVoiceStop = async () => {
    try {
      addLog('⏹️ Stopping voice recognition...');
      await stopNativeVoiceRecognition();
      setIsListening(false);
      addLog('✅ Voice stopped successfully');
    } catch (error) {
      addLog(`❌ Stop failed: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs(['Logs cleared']);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          🔊 Voice Debugger
        </Text>
        <Text style={[styles.status, { color: voiceReady ? '#4ECDC4' : '#FF6B6B' }]}>
          {voiceReady ? '✅ Ready' : '❌ Not Ready'}
        </Text>
      </View>

      <ScrollView
        style={[styles.logsContainer, { backgroundColor: theme.colors.card }]}
      >
        {logs.map((log, index) => (
          <Text
            key={index}
            style={[styles.logText, { color: theme.colors.textSecondary }]}
          >
            {log}
          </Text>
        ))}
      </ScrollView>

      <View style={[styles.buttonContainer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={testVoiceStart}
          disabled={isListening}
          style={[
            styles.button,
            {
              backgroundColor: isListening ? theme.colors.border : '#4ECDC4',
            },
          ]}
        >
          <Text style={styles.buttonText}>
            {isListening ? '🎤 Listening...' : '▶️ Start'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={testVoiceStop}
          disabled={!isListening}
          style={[
            styles.button,
            {
              backgroundColor: !isListening ? theme.colors.border : '#FF6B6B',
            },
          ]}
        >
          <Text style={styles.buttonText}>⏹️ Stop</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={clearLogs}
          style={[styles.button, { backgroundColor: theme.colors.border }]}
        >
          <Text style={styles.buttonText}>🗑️ Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  logsContainer: {
    flex: 1,
    padding: 12,
  },
  logText: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default VoiceDebugger;
