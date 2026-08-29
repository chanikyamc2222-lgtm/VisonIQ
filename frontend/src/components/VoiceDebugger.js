import React, { useState } from 'react';
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

  useEffect(() => {
    addLog('Component mounted');

    if (!hasNativeVoice || !Voice) {
      addLog('❌ Voice module is NULL or not registered on Android');
      setVoiceReady(false);
      return;
    }

    addLog('✅ Voice module found');

    Voice.onSpeechStart = () => addLog('🎤 Speech started');
    Voice.onSpeechEnd = () => addLog('✋ Speech ended');
    Voice.onSpeechResults = (event) => {
      addLog(`📝 Results: ${JSON.stringify(event.value)}`);
      setIsListening(false);
    };
    Voice.onSpeechError = (event) => {
      addLog(`❌ Error: ${event.error}`);
      setIsListening(false);
    };

    setVoiceReady(true);
    addLog('✅ Voice handlers initialized');

    return () => {
      addLog('Component unmounting - cleaning up');
      if (hasNativeVoice && Voice) {
        Voice.destroy?.().catch(e => addLog(`⚠️ Destroy error: ${e}`));
      }
    };
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
  };

  const testVoiceStart = async () => {
    try {
      if (!hasNativeVoice || !Voice || typeof Voice.start !== 'function') {
        addLog('❌ Native Voice module not registered. Rebuild the app and grant microphone permission.');
        setIsListening(false);
        return;
      }
      addLog('🔄 Starting voice recognition...');
      setIsListening(true);
      await Voice.start('en-US');
      addLog('✅ Voice started successfully');
    } catch (error) {
      addLog(`❌ Start failed: ${error.message}`);
      setIsListening(false);
    }
  };

  const testVoiceStop = async () => {
    try {
      if (!hasNativeVoice || !Voice || typeof Voice.stop !== 'function') {
        addLog('❌ Voice stop unavailable because native module is missing');
        return;
      }
      addLog('⏹️ Stopping voice recognition...');
      await Voice.stop();
      setIsListening(false);
      addLog('✅ Voice stopped successfully');
    } catch (error) {
      addLog(`❌ Stop failed: ${error.message}`);
    }
  };

  const testVoiceCancel = async () => {
    try {
      if (!hasNativeVoice || !Voice || typeof Voice.cancel !== 'function') {
        addLog('❌ Voice cancel unavailable because native module is missing');
        return;
      }
      addLog('🚫 Canceling voice recognition...');
      await Voice.cancel();
      setIsListening(false);
      addLog('✅ Voice canceled successfully');
    } catch (error) {
      addLog(`❌ Cancel failed: ${error.message}`);
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
          onPress={testVoiceCancel}
          style={[styles.button, { backgroundColor: '#FFA500' }]}
        >
          <Text style={styles.buttonText}>🚫 Cancel</Text>
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
