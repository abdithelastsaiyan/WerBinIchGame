import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from "react-native";
// Navigation
import { useNavigation } from "@react-navigation/native";
// Firebase
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
// Helpers
import Screen from "../helpers/Screen";
import haptic from "../helpers/Haptics";

const Rooms = (data) => {
  // Navigation
  const navigation = useNavigation();

  // Firebase
  const database = getFirestore();

  // State Variables
  const user = data.route.params;
  const [rooms, setRooms] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [gameMode, setGameMode] = useState("whoami");
  const [roomName, setRoomName] = useState("");

  // Fetch Personal Stuff
  useEffect(() => {
    const dbrooms = query(collection(database, "rooms"));
    const unsubscribe = onSnapshot(
      dbrooms,
      (snapshot) => {
        setRooms(snapshot.docs.map((doc) => doc));
        setIsLoading(false);
      },
      (error) => {
        console.log("Error fetching data: " + error.message);
      }
    );
    return unsubscribe;
  }, []);

  // Functions
  const joinRoom = async (roomID, type) => {
    const docRef = doc(database, "rooms", roomID, "player", user.userID);
    await setDoc(docRef, { name: user.name, avatar: user.avatar }).then(() => {
      switch (type) {
        case "whoami":
          navigation.push("Whoami", { userID: user.userID, roomID: roomID });
          break;

        case "impostor":
          navigation.push("Imposter", {
            userID: user.userID,
            roomID: roomID,
            avatar: user.avatar,
            username: user.name,
          });
        default:
          console.log("hä dieser raum macht keinen sinn!");
          break;
      }
    });
  };

  const handleCreateButton = async () => {
    if (isCreating && roomName !== "") {
      const roomRef = doc(database, "rooms", roomName);
      switch (gameMode) {
        case "impostor":
          await setDoc(roomRef, {
            createdBy: user.userID,
            status: 0,
            round: 1,
            hostName: user.name,
            type: gameMode,
            winner: "",
          }).then(joinRoom(roomName, gameMode));
          setIsCreating(false);
          break;

        case "whoami":
          await setDoc(roomRef, {
            createdBy: user.userID,
            status: 0,
            asking: "",
            answering: "",
            round: 1,
            finished: 0,
            rating: [],
            hostName: user.name,
            type: gameMode,
          }).then(joinRoom(roomName, gameMode));
          setIsCreating(false);
          break;
        default:
          break;
      }
    } else {
      setIsCreating(true);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    const playersRef = collection(database, "rooms", roomId, "player");

    // Lösche alle Dokumente in der Subcollection 'player'
    const playersSnapshot = await getDocs(playersRef);
    const playerDeletions = playersSnapshot.docs.map((playerDoc) =>
      deleteDoc(playerDoc.ref)
    );
    await Promise.all(playerDeletions);
    console.log("Alle Spieler wurden gelöscht.");

    // Lösche das Spiel-Dokument
    const gameDocRef = doc(database, "rooms", roomId);
    await deleteDoc(gameDocRef);
    console.log("Das Spiel wurde gelöscht.");
  };

  return (
    <View style={{ flex: 1, width: "100%" }}>
      <ScrollView>
        {rooms && !isLoading && (
          <View
            style={{
              width: Screen.width,
              height: Screen.width,
              marginTop: 15,
              alignItems: "center",
            }}
          >
            {rooms.map((room) => {
              return (
                <View
                  key={room.id}
                  style={{ width: "100%", alignItems: "center" }}
                >
                  {user.userID === room.data().createdBy ? (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        width: "92%",
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          if (room.data().status === 0) {
                            joinRoom(room.id, room.data().type);
                          }
                        }}
                        activeOpacity={0.7}
                        style={{
                          width: "83%",
                          height: 80,
                          backgroundColor: "#fff",
                          borderRadius: 25,
                          justifyContent: "center",
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: "#3a3a3a",
                            fontSize: 22,
                            fontWeight: "500",
                            marginLeft: 15,
                          }}
                        >
                          {room.id}
                        </Text>
                        <Text
                          style={{
                            color: room.data().status !== 0 ? "#f00" : "#0f0",
                            fontSize: 16,
                            fontWeight: "500",
                            marginLeft: 15,
                            position: "absolute",
                            right: 20,
                          }}
                        >
                          {room.data().status !== 0
                            ? "Spiel läuft"
                            : "Beitreten"}
                        </Text>
                        <Text
                          style={{
                            position: "absolute",
                            bottom: 5,
                            right: 20,
                            fontSize: 8,
                            color: "#5a5a5a",
                          }}
                        >
                          erstellt von: {room.data().hostName}
                          {() => {
                            handleDeleteRoom(room.id);
                          }}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          handleDeleteRoom(room.id);
                        }}
                        style={{
                          width: "15%",
                          backgroundColor: "#fe5f55",
                          height: 80,
                          borderRadius: 15,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Image
                          source={require("../assets/bin.png")}
                          resizeMode="contain"
                          style={{ width: 25, height: 50, tintColor: "#fff" }}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      key={room.id}
                      onPress={() => {
                        if (room.data().status === 0) {
                          joinRoom(room.id, room.data().type);
                        }
                      }}
                      activeOpacity={0.7}
                      style={{
                        width: "90%",
                        height: 80,
                        backgroundColor: "#fff",
                        borderRadius: 25,
                        justifyContent: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: "#3a3a3a",
                          fontSize: 22,
                          fontWeight: "500",
                          marginLeft: 15,
                        }}
                      >
                        {room.id}
                      </Text>
                      <Text
                        style={{
                          color: room.data().status !== 0 ? "#f00" : "#0f0",
                          fontSize: 16,
                          fontWeight: "500",
                          marginLeft: 15,
                          position: "absolute",
                          right: 20,
                        }}
                      >
                        {room.data().status !== 0 ? "Spiel läuft" : "Beitreten"}
                      </Text>
                      <Text
                        style={{
                          position: "absolute",
                          bottom: 5,
                          right: 20,
                          fontSize: 8,
                          color: "#5a5a5a",
                        }}
                      >
                        erstellt von: {room.data().hostName}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      {isCreating && (
        <View
          style={{
            bottom: 145,
            alignSelf: "center",
            position: "absolute",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: Screen.width / 1.1,
              height: 80,
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 25,
              marginBottom: 15,
            }}
          >
            <TextInput
              placeholder="Raum Name"
              placeholderTextColor={"rgba(70, 70, 70, 0.6)"}
              value={roomName}
              autoCorrect={false}
              returnKeyType="done"
              onChangeText={(name) => setRoomName(name)}
              fontSize={19}
              style={{ width: "85%", height: "90%" }}
            />
          </View>
          <View
            style={{
              width: Screen.width / 1.1,
              height: 80,
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 15,
              flexDirection: "row",
            }}
          >
            <TouchableOpacity
              onPress={() => setGameMode("impostor")}
              disabled={gameMode === "impostor"}
              activeOpacity={0.7}
              style={{
                height: 80,
                width: "48%",
                backgroundColor:
                  gameMode === "impostor" ? "#1a1a1a" : "#5a5a5a",
                borderRadius: 25,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 26,
                  color: gameMode === "impostor" ? "#f00" : "#222",
                  fontFamily: "Horror",
                  height: 44,
                  paddingHorizontal: 10,
                }}
              >
                IMPOSTER
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setGameMode("whoami")}
              disabled={gameMode === "whoami"}
              activeOpacity={0.7}
              style={{
                height: 80,
                width: "48%",
                backgroundColor: gameMode === "whoami" ? "#93dbfa" : "#5a5a5a",
                borderRadius: 25,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontFamily: "Good",
                  color: gameMode === "whoami" ? "#fff" : "#222",
                  height: 22,
                }}
              >
                Wer bin ich?
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setIsCreating(false)}
            style={{
              backgroundColor: "#ec2b2b",
              paddingHorizontal: 35,
              paddingVertical: 10,
              borderRadius: 30,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleCreateButton}
        style={{
          borderRadius: 40,
          backgroundColor: isCreating ? "#bff334" : "#000",
          position: "absolute",
          bottom: 45,
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          width: Screen.width / 1.3,
          height: 60,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "500" }}>
          {isCreating ? "Start" : "Raum erstellen"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Rooms;
