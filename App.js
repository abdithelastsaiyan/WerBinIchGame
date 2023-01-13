import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
// Navigation
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator, TransitionPresets } from "@react-navigation/stack";
// Screens
import UserInfoScreen from './screens/UserInfoScreen';
import ChooseAvatarScreen from './screens/ChooseAvatarScreen'
import Rooms from './screens/Rooms';
import Room from './screens/Room';

const Stack = createStackNavigator();

export default function App() {

  const AppStack = () => {
    return (
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="UserInfoScreen"
        >
          <Stack.Screen name="UserInfoScreen" component={UserInfoScreen} options={{ headerShown: false}}/>
          <Stack.Screen
            options={{
              gestureEnabled: true,
              ...TransitionPresets.SlideFromRightIOS,
              headerTransparent: false,
              title: 'Avatar',
              headerBackTitle: 'Back',
              headerTintColor: '#3a3a3a'
            }}
            name="ChooseAvatarScreen"
            component={ChooseAvatarScreen}
          />
          <Stack.Screen
            options={{
              gestureEnabled: true,
              ...TransitionPresets.SlideFromRightIOS,
              headerTransparent: false,
              title: 'Rooms',
              headerBackTitle: 'Back',
              headerTintColor: '#3a3a3a'
            }}
            name="Rooms"
            component={Rooms}
          />
          <Stack.Screen
            options={{
              headerShown: false
            }}
            name="Room"
            component={Room}
          />
        </Stack.Navigator>
      </NavigationContainer>
    )
  }
  return <AppStack />;
}
