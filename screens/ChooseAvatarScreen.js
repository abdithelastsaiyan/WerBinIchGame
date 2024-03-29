import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
// Navigation
import { useNavigation } from "@react-navigation/native";
// Helpers
import Screen from "../helpers/Screen";
import { avatars } from "../helpers/Avatars";

const ChooseAvatarScreen = (chooseAvatar) => {
  const nav = useNavigation();
  const choose = chooseAvatar.route.params;

  return (
    <View
      style={{
        flex: 1,
        width: Screen.width,
        alignItems: "center",
        height: Screen.height,
      }}
    >
      <ScrollView>
        <View
          style={{
            width: Screen.width,
            marginTop: 15,
            paddingHorizontal: 10,
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {avatars.map((avatar, index) => {
            return (
              <TouchableOpacity
                key={avatar}
                onPress={() => {
                  choose(index);
                  nav.goBack();
                }}
                activeOpacity={0.7}
                style={{
                  width:
                    Screen.width >= Screen.height
                      ? Screen.width / 7
                      : Screen.width / 3.5,
                  height:
                    Screen.width >= Screen.height
                      ? Screen.width / 7
                      : Screen.width / 3.5,
                  marginBottom: 15,
                }}
              >
                <Image
                  source={avatar}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: Screen.width / 3.5,
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default ChooseAvatarScreen;
