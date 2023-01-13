import {
    Dimensions,
    SafeAreaView,
    StyleSheet,
    StatusBar,
    Platform,
  } from "react-native";
  
  const Screen = {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    safeWidth: SafeAreaView.width,
    safeHeight: SafeAreaView.length,
  };
  
  const safeArea = StyleSheet.create({
    AndroidSafeArea: {
      flex: 1,
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
  
    AndroidAndIOSSafeArea: {
      flex: 1,
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 45
    },
  
  });
  
  const is16By9 = () => {
    if ((Screen.height / 16) * 9 <= Screen.width + 10) {
      return true;
    }else{
      return false;
    };
  }
  
  
  export default Screen;
  export { safeArea, is16By9 };
  