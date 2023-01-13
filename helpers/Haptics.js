import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const haptic = (type) => {
  switch (type) {
    case "normal":
      if (Platform.OS !== "android") {
        return Haptics.selectionAsync();
      } else {
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      break;

    case "success":
      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      break;

    case "error":
      if (Platform.OS !== "android") {
        return Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
      } else {
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      break;

    case "warning":
      if (Platform.OS !== "android") {
        return Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      } else {
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      break;

    default:
      return null;
      break;
  }
};

export default haptic;