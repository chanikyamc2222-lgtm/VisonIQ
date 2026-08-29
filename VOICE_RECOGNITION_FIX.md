# Voice Recognition Fix Guide

## Issue
When clicking the mic button in the modal, you get error:
```
Unable to continue
Cannot read property 'startSpeech' of null
```

## Root Cause
The Voice module from `@react-native-voice/voice` is not properly initialized on your Android device. This can happen due to:
1. Missing Android permissions
2. Missing AndroidManifest.xml configuration
3. Voice module not properly linked
4. Missing microphone permission grant at runtime

## Solution Steps

### Step 1: Update AndroidManifest.xml
Add these permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest ...>
    <!-- Add these permissions -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
    
    <application ...>
        <!-- Rest of your application configuration -->
    </application>
</manifest>
```

**File Location**: 
`frontend/android/app/src/main/AndroidManifest.xml`

### Step 2: Rebuild Android App
After making changes, rebuild the app completely:

```bash
cd frontend

# Clear all caches
rm -rf android/.gradle
rm -rf android/build
rm -rf node_modules/.cache

# Rebuild
npm run android
```

### Step 3: Grant Permissions at Runtime
When the app first starts, it will ask for microphone permission.
**IMPORTANT**: Click "Allow" when prompted.

### Step 4: Test Voice Recognition

1. Open the app
2. Tap "Capture" button
3. Take a photo or upload one
4. Tap the check (✓) button
5. The voice modal should appear
6. **Click the mic icon** - you should see "Listening..." indicator
7. Speak your question
8. The text should appear automatically

## If Still Getting Error

### Option A: Reinstall the Voice Package
```bash
cd frontend

# Remove and reinstall
npm uninstall @react-native-voice/voice
npm install @react-native-voice/voice@3.2.4

# Clear gradle and rebuild
rm -rf android/.gradle android/build
npm run android
```

### Option B: Check Android Version
Voice recognition requires Android 4.1+. Check your emulator/device:
```bash
# In Android Studio or via:
adb shell getprop ro.build.version.release
```

### Option C: Uninstall and Reinstall App
```bash
# Uninstall from device
adb uninstall com.visioniq

# Rebuild and install
npm run android
```

## Updated VoiceChatModal Features

Your VoiceChatModal now has:
✅ Null checking for Voice object
✅ Voice availability state tracking
✅ Better error messages
✅ Graceful fallback to text input
✅ Disabled state when voice unavailable
✅ Alert when user tries to use unavailable voice

## Testing Checklist

- [ ] App builds without errors
- [ ] Device/emulator runs app
- [ ] Permission prompt appears on first run
- [ ] User grants microphone permission
- [ ] Camera captures or uploads image
- [ ] Preview shows image
- [ ] Check button opens voice modal
- [ ] Mic button is clickable
- [ ] Clicking mic starts listening
- [ ] Speech is captured and converted to text
- [ ] Text auto-submits
- [ ] Modal can be closed

## Microphone Permission Troubleshooting

If permission not showing up:

### For Emulator:
1. Open Android Studio
2. Go to: Tools → Device Manager
3. Click the emulator
4. Select "Settings" → "Apps"
5. Find your app
6. Select "Permissions" → "Microphone"
7. Toggle ON

### For Physical Device:
1. Settings → Apps → VisionIQ
2. Permissions → Microphone
3. Toggle "Allow"

## File Changes Made

### Updated Files:
✅ `src/components/VoiceChatModal.js`
   - Added Voice initialization with null checks
   - Added voiceAvailable state
   - Better error handling
   - Improved mic button behavior

## Next Steps

1. **Update AndroidManifest.xml** with permissions
2. **Rebuild the app** completely
3. **Test voice functionality**
4. **Grant permissions** when prompted

## Debug: Enable Logging

If issues persist, add this to see detailed logs:

```bash
# In terminal where app is running:
adb logcat | grep Voice
# or
adb logcat | grep -i microphone
```

## Still Having Issues?

Try this complete reset:

```bash
cd frontend

# 1. Clean everything
rm -rf node_modules
rm -rf android/.gradle
rm -rf android/build
rm -rf ~/Library/Android/sdk/build-tools/* (if needed)

# 2. Reinstall
npm install

# 3. Rebuild with full logs
npm run android -- --verbose 2>&1 | tee build.log

# 4. Check logs for errors
grep -i "error" build.log
```

## Important Notes

1. **Voice recognition requires microphone permission** - The app will not work without it
2. **Internet connection may be needed** - Some devices use Google's servers for speech recognition
3. **Android 4.1+ required** - Older devices won't support voice recognition
4. **Emulator compatibility** - Some emulators don't support microphone well. Use physical device for best results.

---

**Updated**: 2026-08-29
**Component**: VoiceChatModal.js
**Status**: Ready for testing
