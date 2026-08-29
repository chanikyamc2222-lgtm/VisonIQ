import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { X } from 'lucide-react-native';
import VoiceDebugger from '../components/VoiceDebugger';
import { useTheme } from '../theme/theme';

/**
 * VoiceTestScreen
 * 
 * Debugging screen for voice recognition issues
 * 
 * Add this to your AppNavigator.js to access it:
 * <Stack.Screen name="VoiceTest" component={VoiceTestScreen} />
 * 
 * Then navigate to it:
 * navigation.navigate('VoiceTest');
 */
export const VoiceTestScreen = ({ navigation }) => {
  const theme = useTheme();
  const [debuggerVisible, setDebuggerVisible] = useState(true);
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {debuggerVisible ? (
        <>
          {/* Header with close button */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Voice Recognition Test
            </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <X color={theme.colors.text} size={24} />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <ScrollView style={styles.instructionsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              📋 Instructions
            </Text>
            <View style={[styles.instructionBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.instructionText, { color: theme.colors.text }]}>
                1. Make sure microphone permission is granted{'\n'}
                2. Tap "Start" button to begin voice recording{'\n'}
                3. Speak into your device microphone{'\n'}
                4. Tap "Stop" when done speaking{'\n'}
                5. Check the logs below to see results
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              🔍 Troubleshooting
            </Text>
            <View style={[styles.troubleBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.troubleText, { color: theme.colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>❌ Error: Cannot read property 'startSpeech' of null</Text>
                {'\n\n'}
                1. Check AndroidManifest.xml has RECORD_AUDIO permission
                {'\n'}
                2. Grant microphone permission to the app
                {'\n'}
                3. Rebuild the app: npm run android
                {'\n'}
                4. Try on a physical device (emulators have issues)
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              ✅ What to test
            </Text>
            <View style={[styles.testBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.testText, { color: theme.colors.text }]}>
                ☑️ Voice module loads without error
                {'\n'}
                ☑️ Can start voice recognition
                {'\n'}
                ☑️ Microphone input is captured
                {'\n'}
                ☑️ Text is recognized correctly
                {'\n'}
                ☑️ Can stop voice recognition gracefully
              </Text>
            </View>
          </ScrollView>

          {/* Debugger */}
          <View style={styles.debuggerWrapper}>
            <VoiceDebugger />
          </View>
        </>
      ) : (
        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            Debugger Hidden
          </Text>
          <TouchableOpacity
            onPress={() => setDebuggerVisible(true)}
            style={styles.showButton}
          >
            <Text style={styles.showButtonText}>Show Debugger</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  instructionsContainer: {
    flex: 0.4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  instructionBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  troubleBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  troubleText: {
    fontSize: 11,
    lineHeight: 16,
  },
  testBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  testText: {
    fontSize: 11,
    lineHeight: 16,
  },
  debuggerWrapper: {
    flex: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 20,
  },
  showButton: {
    backgroundColor: '#FFC400',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  showButtonText: {
    color: '#000',
    fontWeight: '700',
  },
});

export default VoiceTestScreen;
