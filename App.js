import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
// Navigation
import { NavigationContainer } from "@react-navigation/native";
import {
  createStackNavigator,
  TransitionPresets,
} from "@react-navigation/stack";
// Screens
import UserInfoScreen from "./screens/UserInfoScreen";
import ChooseAvatarScreen from "./screens/ChooseAvatarScreen";
import Rooms from "./screens/Rooms";
import WhoamiRoom from "./screens/whoami/WhoamiRoom";
import ImposterRoom from "./screens/imposter/ImposterRoom";

const Stack = createStackNavigator();

export default function App() {
  const AppStack = () => {
    const [fontsLoaded] = useFonts({
      Horror: require("./assets/fonts/Danger.otf"),
      Good: require("./assets/fonts/AmericanCaptain.ttf"),
    });
    if (!fontsLoaded) {
      return (
        <View
          style={{ justifyContent: "center", flex: 1, alignItems: "center" }}
        >
          <Text>Failed to load fonts</Text>
        </View>
      );
    }
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator initialRouteName="UserInfoScreen">
          <Stack.Screen
            name="UserInfoScreen"
            component={UserInfoScreen}
            options={{ headerShown: false, title: "Wer bin Ich?!" }}
          />
          <Stack.Screen
            options={{
              gestureEnabled: true,
              ...TransitionPresets.SlideFromRightIOS,
              headerTransparent: false,
              title: "Wähle deinen Avatar",
              headerBackTitle: "Back",
              headerTintColor: "#3a3a3a",
            }}
            name="ChooseAvatarScreen"
            component={ChooseAvatarScreen}
          />
          <Stack.Screen
            options={{
              gestureEnabled: true,
              ...TransitionPresets.SlideFromRightIOS,
              headerTransparent: false,
              title: "Games",
              headerBackTitle: "Back",
              headerTintColor: "#3a3a3a",
            }}
            name="Rooms"
            component={Rooms}
          />
          <Stack.Screen
            options={{
              headerShown: false,
              gestureEnabled: false,
              title: "Wer bin Ich?",
            }}
            name="Whoami"
            component={WhoamiRoom}
          />
          <Stack.Screen
            options={{
              headerShown: false,
              gestureEnabled: false,
              title: "IMPOSTER",
            }}
            name="Imposter"
            component={ImposterRoom}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  };
  return <AppStack />;
}
