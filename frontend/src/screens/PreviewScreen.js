import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Text,
  Dimensions,
} from 'react-native';
import { X, Check, Trash2 } from 'lucide-react-native';
import { useTheme } from '../theme/theme';
import VoiceChatModal from '../components/VoiceChatModal';

const { width, height } = Dimensions.get('window');
const YELLOW = '#FFC400';

export const PreviewScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { imageUri } = route.params || {};
  const [modalVisible, setModalVisible] = useState(false);
  const [isImageConfirmed, setIsImageConfirmed] = useState(false);
  const [lastSubmittedQuestion, setLastSubmittedQuestion] = useState('');

  if (!imageUri) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          No image provided
        </Text>
      </SafeAreaView>
    );
  }

  const handleConfirm = () => {
    setIsImageConfirmed(true);
    setLastSubmittedQuestion('');
    setModalVisible(true);
  };

  const handleDiscard = () => {
    navigation.goBack();
  };

  const handleRemoveImage = () => {
    setIsImageConfirmed(false);
    setLastSubmittedQuestion('');
    setModalVisible(false);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const handleVoiceSubmit = (question) => {
    setLastSubmittedQuestion(question);
    console.log('Voice question submitted:', question);
    // Here you would typically send the question to your backend/API
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Image Display */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Review image
        </Text>
        <TouchableOpacity onPress={handleDiscard} style={styles.closeButton}>
          <View style={styles.closeCircle}>
            <X color="#fff" size={24} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Actions */}
      <View style={[styles.actionBar, { backgroundColor: theme.colors.cardDark }]}>
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          {isImageConfirmed ? 'Choose another image or remove this one' : 'Image ready for analysis'}
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isImageConfirmed ? (
            <>
              {/* Re-upload button */}
              <TouchableOpacity
                onPress={handleDiscard}
                style={[styles.smallButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[styles.smallButtonText, { color: theme.colors.text }]}>
                  Upload New
                </Text>
              </TouchableOpacity>

              {/* Delete button */}
              <TouchableOpacity
                onPress={handleRemoveImage}
                style={[styles.deleteButton, { backgroundColor: '#FF6B6B' + '20' }]}
              >
                <Trash2 color="#FF6B6B" size={24} />
              </TouchableOpacity>

              {/* Camera button */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Camera')}
                style={[styles.smallButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[styles.smallButtonText, { color: theme.colors.text }]}>
                  Camera
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Confirm button */
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmButton, { backgroundColor: YELLOW }]}
            >
              <Check color="#000" size={32} strokeWidth={3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Voice Chat Modal */}
      <VoiceChatModal
        visible={modalVisible}
        onClose={handleModalClose}
        imageUri={imageUri}
        onSubmit={handleVoiceSubmit}
      />

      {/* Last submitted question display */}
      {lastSubmittedQuestion && !modalVisible && (
        <View style={[styles.submitDisplay, { backgroundColor: YELLOW + '10', borderColor: YELLOW }]}>
          <Text style={[styles.submitLabel, { color: YELLOW }]}>Last submitted:</Text>
          <Text style={[styles.submitText, { color: theme.colors.text }]}>
            {lastSubmittedQuestion}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  confirmButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitDisplay: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: width - 32,
  },
  submitLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  submitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default PreviewScreen;
