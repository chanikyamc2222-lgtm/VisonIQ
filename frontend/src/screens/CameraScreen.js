import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Text,
  Dimensions,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import LottieView from 'lottie-react-native';
import { X, ImagePlus, Check, Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/theme';
import scanLoader from '../assets/scan-loader.json';

const { width, height } = Dimensions.get('window');
const YELLOW = '#FFC400';

export const CameraScreen = ({ navigation, onImageCaptured }) => {
  const theme = useTheme();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleUpload = () => {
    // Handle file upload from gallery
    navigation.navigate('Upload');
  };

  const handleCapture = async () => {
    if (!ready || capturing || !cameraRef.current) return;
    try {
      setCapturing(true);
      const file = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      const uri = file.filePath.startsWith('file://') ? file.filePath : `file://${file.filePath}`;
      
      // Navigate to preview with captured image
      navigation.navigate('Preview', { imageUri: uri });
    } catch (error) {
      console.error('Capture error:', error);
    } finally {
      setCapturing(false);
    }
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera permission is required.</Text>
          <TouchableOpacity onPress={requestPermission} style={{ marginTop: 16, backgroundColor: YELLOW, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
            <Text style={{ color: '#000', fontWeight: '700' }}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No back camera is available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Camera View */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        outputs={[photoOutput]}
        onPreviewStarted={() => setReady(true)}
        onPreviewStopped={() => setReady(false)}
      />

      {/* Close Button - Top Left */}
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <View style={styles.iconCircle}>
          <X color="#fff" size={24} />
        </View>
      </TouchableOpacity>

      {/* Tip Text */}
      <View style={styles.tipContainer}>
        <Sparkles color={YELLOW} size={15} />
        <Text style={styles.tipText}>Point at anything to explore</Text>
      </View>

      {/* Focus Frame */}
      <View pointerEvents="none" style={styles.focusFrame}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlBar}>
        {/* Upload Button */}
        <TouchableOpacity 
          onPress={handleUpload} 
          style={styles.sideButton}
          activeOpacity={0.7}
        >
          <View style={styles.buttonIcon}>
            <ImagePlus color="#fff" size={28} />
          </View>
          <Text style={styles.buttonLabel}>Upload</Text>
        </TouchableOpacity>

        {/* Capture Button - Center */}
        <TouchableOpacity
          disabled={!ready || capturing}
          onPress={handleCapture}
          style={[styles.captureButton, (!ready || capturing) && styles.captureButtonDisabled]}
          activeOpacity={0.8}
        >
          {capturing ? (
            <LottieView
              autoPlay
              loop
              source={scanLoader}
              style={styles.lottieMini}
            />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>

        {/* Empty Space for Balance */}
        <View style={styles.sideButton} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContainer: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  focusFrame: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    width: '70%',
    aspectRatio: 0.9,
    borderRadius: 20,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: YELLOW,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  controlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sideButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  buttonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 196, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: YELLOW,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
  },
  lottieMini: {
    width: 60,
    height: 60,
  },
});

export default CameraScreen;
