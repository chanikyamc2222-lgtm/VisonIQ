import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import PreviewScreen from '../screens/PreviewScreen';
import VoiceTestScreen from '../screens/VoiceTestScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
          cardStyle: { backgroundColor: '#050505' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            animationEnabled: false,
          }}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{
            animationEnabled: true,
          }}
        />
        <Stack.Screen
          name="Preview"
          component={PreviewScreen}
          options={{
            animationEnabled: true,
          }}
        />
        <Stack.Screen
          name="VoiceTest"
          component={VoiceTestScreen}
          options={{
            animationEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
