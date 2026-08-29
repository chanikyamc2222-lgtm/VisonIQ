import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { theme } from '../theme/theme';

const HomeScreen = () => {
  const camera = useRef(null);
  const device = useCameraDevice('back');
  const [selectedTab, setSelectedTab] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [imageUri, setImageUri] = useState(null);

  const showError = message => Alert.alert('Unable to continue', message);

  const openCamera = async () => {
    const permission = await Camera.requestCameraPermission();
    const granted = permission === 'granted';
    setHasCameraPermission(granted);

    if (!granted) {
      showError('Camera permission is required to take a photo. Enable it in Settings and try again.');
      return;
    }

    setSelectedTab('Camera');
  };

  const takePicture = async () => {
    if (!camera.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await camera.current.takePhoto({ flash: 'off' });
      setImageUri(photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`);
      setSelectedTab('Preview');
    } catch (error) {
      showError(error.message || 'The photo could not be captured. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const selectImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: false,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      showError(result.errorMessage || 'The image picker could not be opened.');
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      showError('No image was selected. Please choose an image and try again.');
      return;
    }

    setImageUri(asset.uri);
    setSelectedTab('Preview');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>iQOO Vision AI</Text>
        <Text style={styles.subtitle}>Visual assistant for real-world understanding</Text>
      </View>

      <View style={styles.cameraFrame}>
        {selectedTab === 'Camera' && hasCameraPermission && device ? (
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            photo
            onError={error => showError(error.message || 'The camera could not be opened.')}
          />
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        ) : selectedTab === 'Camera' && !device ? (
          <Text style={styles.cameraHint}>No back camera is available on this device.</Text>
        ) : (
          <Text style={styles.cameraHint}>Choose Capture to take a photo or Upload to select one.</Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <ActionButton label="History" active={selectedTab === 'History'} onPress={() => setSelectedTab('History')} />
        <ActionButton label="Capture" active={selectedTab === 'Camera'} onPress={openCamera} />
        <ActionButton label="Upload" active={false} onPress={selectImage} />
      </View>

      {selectedTab === 'Camera' && hasCameraPermission && device && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          disabled={isCapturing}
          onPress={takePicture}
          style={[styles.shutterButton, isCapturing && styles.shutterButtonDisabled]}
        >
          {isCapturing ? <ActivityIndicator color={theme.colors.text} /> : <Text style={styles.shutterLabel}>Take photo</Text>}
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Quick analysis</Text>
        <Text style={styles.resultText}>- Identify objects</Text>
        <Text style={styles.resultText}>- Count visible items</Text>
        <Text style={styles.resultText}>- Detect product or category</Text>
        <Text style={styles.resultText}>- Ask follow-up questions on the same image</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionButton = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.actionButton, active && styles.actionButtonActive]}
  >
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 18,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  cameraFrame: {
    height: 440,
    borderRadius: 28,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHint: {
    color: theme.colors.muted,
    fontSize: 18,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  actionLabel: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  shutterButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    marginBottom: 16,
    paddingVertical: 14,
  },
  shutterButtonDisabled: {
    opacity: 0.65,
  },
  shutterLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  content: {
    paddingBottom: 28,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  resultText: {
    color: theme.colors.muted,
    marginBottom: 8,
    fontSize: 15,
  },
});

export default HomeScreen;
