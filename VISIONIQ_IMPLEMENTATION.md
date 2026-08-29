# VisionIQ - React Native App Implementation

## 🎯 Project Overview

VisionIQ is a visual AI assistant application built with React Native that allows users to capture or upload images and interact with them using voice commands and text queries. The app follows the elegant dark-themed design with gold/yellow accents as shown in the VisionIQ branding.

## 📦 Installed Dependencies

### Core Packages
- `react-native@0.87.1` - React Native framework
- `react@19.2.3` - React core
- `@react-navigation/native@7.3.18` - Navigation framework
- `@react-navigation/native-stack@7.18.10` - Stack navigation
- `react-native-vision-camera@5.2.3` - Camera access and control
- `@react-native-voice/voice@3.2.4` - Voice recognition
- `react-native-image-picker@8.2.1` - Image selection from gallery

### UI & Animation
- `lottie-react-native@7.5.0` - Smooth animations
- `lucide-react-native@1.37.0` - Vector icons (Camera, Upload, Send, Mic, etc.)

### State Management
- `@reduxjs/toolkit@2.12.0` - Redux state management
- `react-redux@9.3.0` - React bindings for Redux
- `redux-persist@6.0.0` - Redux persistence

### Utilities
- `@react-native-async-storage/async-storage@3.1.1` - Local storage
- `react-native-permissions@5.6.1` - Permission handling
- `react-native-safe-area-context@5.5.2` - Safe area handling
- `react-native-screens@4.27.0` - Performance optimization

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── VoiceChatModal.js       # Bottom sheet modal for voice chat
│   ├── screens/
│   │   ├── HomeScreen.js           # Main home screen with tiles
│   │   ├── CameraScreen.js         # Full-screen camera interface
│   │   └── PreviewScreen.js        # Image preview and confirmation
│   ├── navigation/
│   │   └── AppNavigator.js         # Navigation configuration
│   ├── store/
│   │   ├── store.js                # Redux store configuration
│   │   └── slices/
│   │       └── historySlice.js     # Image history slice
│   ├── theme/
│   │   └── theme.js                # Theme and useTheme hook
│   ├── constants/
│   │   └── index.js                # App constants
│   ├── services/
│   │   ├── api/
│   │   │   └── visionApi.js        # API service
│   │   └── storage/
│   │       └── storage.js          # Storage service
│   └── assets/
│       └── scan-loader.json        # Lottie animation for loading
├── App.js                           # Main app component
└── package.json                     # Dependencies

```

## 🎨 Design System

### Color Scheme
- **Background**: `#050505` (Pure Black)
- **Card Background**: `#121212` (Dark Gray)
- **Primary Accent**: `#FFC400` (Gold/Yellow)
- **Secondary Accent**: `#FFD700` (Lighter Gold)
- **Text Primary**: `#F5F5F5` (Off White)
- **Text Secondary**: `#A6A6A6` (Light Gray)
- **Text Muted**: `#888888` (Muted Gray)

### Typography
- Titles: Bold, 28-32px
- Headings: Semibold, 16-20px
- Body Text: Regular/Medium, 14px
- Labels: Semibold, 12px

## 🎯 Features Implemented

### 1. **Home Screen** (`HomeScreen.js`)
- **Landing Animation**: Lottie animation when app loads (2 seconds)
- **Feature Tiles**: 4 interactive tiles (Capture, Upload, History, Settings)
- **Hero Section**: Large tap-to-scan area with animated rings
- **Recent Scans**: Display last 4 captured/uploaded images
- **Info Section**: Step-by-step guide on how the app works
- **Bottom Dock**: Quick access buttons (History, Capture, Upload)

### 2. **Camera Screen** (`CameraScreen.js`)
- **Full-Screen Camera**: Immersive camera experience
- **Camera Frame**: Yellow corner guides for composition
- **Tip Text**: "Point at anything to explore" message
- **Capture Button**: Central gold button with lottie animation during capture
- **Upload Button**: Side button to select from gallery
- **Close Button**: Top-left X to exit camera
- **Permissions**: Automatic camera permission request

### 3. **Preview Screen** (`PreviewScreen.js`)
- **Image Display**: Full-screen image preview
- **Confirmation Flow**: 
  - Initial state: Show check button to confirm
  - Confirmed state: Show delete and re-upload options
- **Delete Icon**: Remove image and try new one
- **Re-upload Button**: Quick access to gallery
- **Close Button**: Exit preview
- **Last Submitted Display**: Show recent questions asked

### 4. **Voice Chat Modal** (`VoiceChatModal.js`)
- **Bottom Sheet**: 35% device height sticky modal
- **Auto-dismiss**: Click backdrop or Android back button to close
- **Thumbnail Display**: Shows image being analyzed
- **Search Input**: Text field for user queries
- **Mic Icon**: 
  - Tap to start voice recognition
  - Tap again to stop recording
  - Color changes when active (Gold)
- **Send Button**: Submit question
- **Voice Recognition**:
  - Auto-capture speech
  - Auto-submit when speech ends
  - Error handling
- **Message Display**: Shows submitted questions

### 5. **Theme System** (`theme.js`)
- **useTheme Hook**: React context for theme access
- **Color Palette**: VisionIQ branded colors
- **Spacing System**: Consistent padding/margin values
- **Border Radius**: Standardized corner radius values

### 6. **Navigation** (`AppNavigator.js`)
- **Stack Navigation**: Home → Camera → Preview
- **Modal Navigation**: Voice Chat Modal as overlay
- **Animation**: Smooth screen transitions

## 🎬 Animation Assets

### Lottie Animations
- **scan-loader.json**: Loading animation for camera capture
- Location: `frontend/src/assets/scan-loader.json`

## 📱 Screen Flow

```
Home Screen
    ↓ (Capture/Upload)
Camera Screen
    ↓ (Capture/Select)
Preview Screen
    ├─ Confirm ─→ Voice Chat Modal
    ├─ Delete
    ├─ Re-upload ─→ Camera/Gallery
    └─ Close ─→ Home
```

## 🔊 Voice Recognition

### Capabilities
- **Language**: English (en-US)
- **Auto-submit**: Speech automatically submitted when user stops talking
- **Error Handling**: Graceful error messages
- **Mic Icon Feedback**: Visual indication of listening state

### Integration
- Built on `@react-native-voice/voice` package
- Handles lifecycle properly (cleanup on unmount)
- Cancels listening on modal close

## 🎨 UI Component Features

### Tiles/Cards
- **Border Styling**: Colored borders matching feature theme
- **Icon Containers**: Semi-transparent backgrounds
- **Shadow Effects**: Subtle elevation shadows
- **Touch Feedback**: Active opacity animations

### Buttons
- **Confirm Button**: Large gold circle with check icon
- **Action Buttons**: Secondary buttons with borders
- **Icon Buttons**: Circular icon buttons (Mic, Send, Close)
- **All Buttons**: Touch feedback with activeOpacity

### Icons
- **Source**: lucide-react-native (Material Design inspired)
- **Icons Used**:
  - `Camera` - Camera capture
  - `Upload` - File upload
  - `Check` - Confirmation
  - `X` - Close/Cancel
  - `Trash2` - Delete
  - `Mic` - Voice recognition
  - `Send` - Submit
  - `Sparkles` - Premium feature indicator
  - `ChevronRight` - Navigation indicator
  - `History` - Recent items
  - `Brain` - AI capability
  - `Zap` - Fast/powerful feature

## 🚀 How to Run

### Prerequisites
- Node.js >= 22.11.0
- Android SDK (for Android development)
- React Native CLI

### Installation
```bash
cd frontend
npm install
```

### Run Android
```bash
npm run android
```

### Run iOS
```bash
npm run ios
```

## 🔧 Configuration Files

### android/build.gradle
Fixed for React Native 0.87.1:
- Updated compileSdk from 28 to 34
- Replaced deprecated jcenter() with mavenCentral() and google()
- Updated proguard configuration
- Migrated to AndroidX dependencies

## 📝 Key Implementations

### State Management
- Redux for global state (history)
- Redux Persist for data persistence
- AsyncStorage for local storage

### Camera Handling
- React Native Vision Camera for full control
- Photo output configuration
- File path conversion (file:// URI handling)

### Permissions
- Camera permission request on demand
- Permission checking before camera access
- Error handling for denied permissions

### Error Handling
- User-friendly error alerts
- Voice recognition error catching
- Camera operation error handling
- Image picker error management

## 🎯 Next Steps / Future Enhancements

1. **Backend Integration**: Connect to API for image analysis
2. **Chat History**: Store and display conversation history
3. **Multiple Images**: Support analyzing multiple images together
4. **Image Filters**: Add filters and editing capabilities
5. **Export Results**: Save/share analysis results
6. **Offline Mode**: Cache results for offline access
7. **Dark/Light Theme Toggle**: Theme switcher
8. **Multi-language Support**: i18n implementation
9. **Analytics**: Track user interactions and usage patterns
10. **Push Notifications**: Alert users about analysis results

## 📚 Component Props & Parameters

### HomeScreen
- No props required
- Uses navigation from context

### CameraScreen
- **Props**:
  - `navigation`: Navigation object
  - `onImageCaptured`: Optional callback

### PreviewScreen
- **Route Params**:
  - `imageUri`: Image file URI (required)

### VoiceChatModal
- **Props**:
  - `visible`: Boolean to show/hide modal
  - `onClose`: Callback when modal closes
  - `imageUri`: URI of the image being analyzed
  - `onSubmit`: Callback with submitted question

## ✅ Testing Checklist

- [ ] Home screen loads with animation
- [ ] Camera opens and captures image
- [ ] Image upload from gallery works
- [ ] Preview shows captured/uploaded image
- [ ] Voice recognition starts/stops properly
- [ ] Text input submits correctly
- [ ] Modal closes on backdrop/back press
- [ ] Animations play smoothly
- [ ] Icons display correctly
- [ ] Colors match design

## 🐛 Known Issues & Workarounds

1. **React Native Voice**: Requires proper permission setup in AndroidManifest.xml
2. **Camera Permission**: May need manual permission grant on first run
3. **Lottie Animation**: Ensure animation JSON files are in assets

## 📞 Support

For issues or questions, refer to:
- React Native Documentation: https://reactnative.dev
- React Navigation: https://reactnavigation.org
- Vision Camera: https://react-native-vision-camera.com
- Redux Documentation: https://redux.js.org

---

**Last Updated**: 2026-08-29
**App Version**: 0.0.1
**React Native**: 0.87.1
