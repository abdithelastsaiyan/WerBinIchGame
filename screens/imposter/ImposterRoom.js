import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
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
  writeBatch,
  updateDoc,
  deleteDoc,
  deleteField,
} from "firebase/firestore";
// Helpers
import Screen, { safeArea } from "../../helpers/Screen";
import { avatars } from "../../helpers/Avatars";
import haptic from "../../helpers/Haptics";
import { StatusBar } from "expo-status-bar";

const ImposterRoom = (data) => {
  // Navigation
  const navigation = useNavigation();

  // Firebase
  const database = getFirestore();

  //State Variables
  const myID = data.route.params.userID;
  const room = data.route.params.roomID;
  const name = data.route.params.username;
  const avatar = data.route.params.avatar;
  const [game, setGame] = useState();
  const [player, setPlayer] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [chosenWord, setChosenWord] = useState("");
  const [votedFor, setVotedFor] = useState("");
  const [currentStatus, setCurrentStatus] = useState(0);

  // Functions
  function pickImpostorAndChooser(playerIds) {
    // Ersten eindeutigen Index zufällig auswählen
    const impostor = Math.floor(Math.random() * playerIds.length);

    // Einen zweiten, unterschiedlichen Index auswählen
    let chooser;
    do {
      chooser = Math.floor(Math.random() * playerIds.length);
    } while (chooser === impostor); // Dies stellt sicher, dass secondIndex nicht gleich firstIndex ist

    // Rückgabe der zwei zufällig ausgewählten, eindeutigen Spieler-IDs
    return [playerIds[impostor], playerIds[chooser]];
  }

  function shuffleArray(array) {
    let currentIndex = array.length,
      temporaryValue,
      randomIndex;

    // Solange es Elemente zu mischen gibt
    while (currentIndex !== 0) {
      // Ein verbleibendes Element zufällig auswählen
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // Und es mit dem aktuellen Element tauschen
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  const startGame = () => {
    const players = player.map((p) => p.id);
    const shuffledPlayerIds = shuffleArray([...players]);
    const [impostor, chooser] = pickImpostorAndChooser(players);
    handleAdminNext(impostor, chooser, shuffledPlayerIds);
  };

  // Firebase Functions
  const exitRoom = async () => {
    try {
      const playerRef = doc(database, "rooms", room, "player", myID);
      // Lösche das Dokument
      await deleteDoc(playerRef).then(navigation.goBack());
    } catch (error) {
      console.log("error while exiting and deleting" + error);
    }
  };

  const handleAdminNext = async (impostor, chooser, players) => {
    const gameRef = doc(database, "rooms", room);
    if (game.status === 0) {
      await updateDoc(gameRef, {
        status: 1,
        impostor: impostor,
        wordChooser: chooser,
        playerSequence: players,
      });
    }
    if (game.status === 1) {
      await updateDoc(gameRef, {
        status: 2,
        chosenWord: chosenWord,
        currentPlayer: 0,
      });
    }
  };

  const nextPlayersTurn = async () => {
    const gameRef = doc(database, "rooms", room);

    if (game.playerSequence[game.currentPlayer] === myID) {
      console.log("yes its me");
      if (game.currentPlayer + 1 === player.length) {
        console.log("yes im the last one");
        if (game.round === 3) {
          console.log("and its the last round so lets vote!");
          await updateDoc(gameRef, {
            status: 3,
          });
        } else {
          console.log("so next round!");
          await updateDoc(gameRef, {
            currentPlayer: 0,
            round: game.round + 1,
          });
        }
      } else {
        await updateDoc(gameRef, {
          currentPlayer: game.currentPlayer + 1,
        });
      }
    } else {
      console.log("du bist nicht dran! aber hä");
    }
  };

  const voteForPlayer = async () => {
    const playerRef = doc(database, "rooms", room, "player", myID);
    if (votedFor !== "") {
      await updateDoc(playerRef, {
        votedFor: votedFor,
      }).then(setVotedFor("done"));
    }
  };

  const handleVotes = async () => {
    const voteCounts = {};
    const gameRef = doc(database, "rooms", room);
    player.forEach((player) => {
      const votedFor = player.data().votedFor;
      if (votedFor) {
        voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
      }
    });

    let maxVotes = 0;
    let winners = [];
    Object.entries(voteCounts).forEach(([playerId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winners = [playerId];
      } else if (votes === maxVotes) {
        winners.push(playerId);
      }
    });

    if (winners.length > 1) {
      await updateDoc(gameRef, {
        status: 6,
      });
    } else if (winners.length === 1) {
      console.log(`Der Gewinner ist Spieler mit der ID: ${winners[0]}`);
      if (winners[0] === game.impostor) {
        await updateDoc(gameRef, {
          status: 4,
        });
      } else {
        await updateDoc(gameRef, {
          winner: "impostor",
          status: 5,
        });
      }
    } else {
      console.log("Keine Stimmen abgegeben.");
    }
  };

  const backToVote = async () => {
    const players = player.map((p) => p.id);
    const batch = writeBatch(database);

    try {
      players.forEach((p) => {
        const playerDocRef = doc(database, "rooms", room, "player", p);
        batch.update(playerDocRef, {
          votedFor: deleteField(),
        }); // Setzt 'hasChosenFor' zurück
      });
      const gameRef = doc(database, "rooms", room);
      batch.update(gameRef, {
        status: 3,
      });

      await batch.commit();
      console.log("Alle Spieler wurden für die neue Runde zurückgesetzt.");
    } catch (error) {
      console.error("Fehler beim Zurücksetzen der Spieler:", error);
    }
  };

  const impostorLastChance = async (chance) => {
    const gameRef = doc(database, "rooms", room);
    if (chance === "correct") {
      await updateDoc(gameRef, {
        winner: "impostor",
        status: 5,
      });
    } else {
      await updateDoc(gameRef, {
        winner: "crewmate",
        status: 5,
      });
    }
  };

  const backToTheLobby = async () => {
    const players = player.map((p) => p.id);
    const batch = writeBatch(database);

    try {
      players.forEach((p) => {
        const playerDocRef = doc(database, "rooms", room, "player", p);
        batch.update(playerDocRef, {
          votedFor: deleteField(),
        }); // Setzt 'hasChosenFor' zurück
      });
      const gameRef = doc(database, "rooms", room);
      batch.update(gameRef, {
        winner: "",
        status: 0,
        chosenWord: deleteField(),
        currentPlayer: deleteField(),
        impostor: deleteField(),
        wordChooser: deleteField(),
        playerSequence: deleteField(),
        round: 0,
      });

      await batch.commit();
      console.log("Alle Spieler wurden für die neue Runde zurückgesetzt.");
    } catch (error) {
      console.error("Fehler beim Zurücksetzen der Spieler:", error);
    }
  };

  // Realtime Data Fetchers
  useEffect(() => {
    const unsub = onSnapshot(doc(database, "rooms", room), (doc) => {
      setGame(doc.data());
      console.log("es ist was passiert!");
      if (doc.data().status !== currentStatus) {
        haptic("normal");
        setCurrentStatus(doc.data().status);
        console.log("STATUS ÄNDERUNG");
      }
      if (doc.data().status === 6) {
        console.log("alle müssen einig!");
        setVotedFor("");
      }
      if (doc.data().status === 0) {
        console.log("cool zurück zur lobby");
        setChosenWord("");
        setVotedFor("");
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const playerdb = query(collection(database, "rooms", room, "player"));
    const unsubscribe = onSnapshot(
      playerdb,
      (snapshot) => {
        setPlayer(snapshot.docs.map((doc) => doc));
        setIsLoading(false);
      },
      (error) => {
        console.log("Error fetching data: " + error.message);
      }
    );
    return unsubscribe;
  }, []);

  return (
    <View
      style={[
        safeArea.AndroidAndIOSSafeArea,
        {
          flex: 1,
          width: Screen.width,
          backgroundColor: "#F05454",
        },
      ]}
    >
      <StatusBar style="light" />
      {player && !isLoading && (
        <>
          {/* HEADER */}
          <View
            style={{
              backgroundColor: "#F05454",
              width: Screen.width,
              height: 70,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Lobby */}
            {game.status === 0 && (
              <View
                style={{
                  width: Screen.width,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  onPress={() => exitRoom()}
                  style={{
                    position: "absolute",
                    left: 15,
                    paddingHorizontal: 20,
                    paddingVertical: 9,
                    backgroundColor: "#191919",
                    borderRadius: 25,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                  >
                    Exit
                  </Text>
                </TouchableOpacity>
                <View style={{ backgroundColor: "#fff", borderRadius: 20 }}>
                  <Text
                    style={{
                      color: "#191919",
                      fontSize: 18,
                      fontWeight: "900",
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                    }}
                  >
                    IMPOSTOR!
                  </Text>
                </View>
                {game.createdBy === myID && (
                  <TouchableOpacity
                    onPress={startGame}
                    disabled={player.length < 3}
                    style={{
                      position: "absolute",
                      right: 15,
                      paddingHorizontal: 20,
                      paddingVertical: 9,
                      backgroundColor:
                        player.length > 2 ? "#59CE8F" : "#5a5a5a",
                      borderRadius: 25,
                    }}
                  >
                    <Image
                      source={require("../../assets/play.png")}
                      resizeMode="contain"
                      style={{
                        width: 30,
                        height: 20,
                        tintColor: player.length > 2 ? "#fff" : "#000",
                      }}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {/* Character zuteilung */}
            {game.status === 1 && (
              <View
                style={{
                  width: Screen.width,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {game.createdBy === myID && (
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      left: 15,
                      paddingHorizontal: 20,
                      paddingVertical: 9,
                      backgroundColor: "#191919",
                      borderRadius: 25,
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                    >
                      Back
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={{ backgroundColor: "#fff", borderRadius: 20 }}>
                  <Text
                    style={{
                      color: "#191919",
                      fontSize: 18,
                      fontWeight: "900",
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                    }}
                  >
                    IMPOSTOR!
                  </Text>
                </View>
              </View>
            )}
            {/* ROUNDS */}
            {game.status === 2 && (
              <View style={{ backgroundColor: "#fff", borderRadius: 20 }}>
                <Text
                  style={{
                    color: "#191919",
                    fontSize: 18,
                    fontWeight: "900",
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                  }}
                >
                  IMPOSTOR!
                </Text>
              </View>
            )}
            {/* VOTING */}
            {game.status === 3 && (
              <View
                style={{
                  width: Screen.width,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {game.createdBy === myID && (
                  <TouchableOpacity
                    disabled={
                      player.reduce((acc, all) => {
                        if (all.data().votedFor) {
                          return acc + 1;
                        }
                        return acc;
                      }, 0) !== player.length
                    }
                    onPress={handleVotes}
                    style={{
                      paddingLeft: 20,
                      paddingRight: 15,
                      paddingVertical: 12,
                      borderRadius: 20,
                      backgroundColor:
                        player.reduce((acc, all) => {
                          if (all.data().votedFor) {
                            return acc + 1;
                          }
                          return acc;
                        }, 0) !== player.length
                          ? "#5a5a5a"
                          : "#59CE8F",
                      position: "absolute",
                      left: 15,
                      flexDirection: "row",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Good",
                        fontSize: 18,
                        height: 14,
                        color:
                          player.reduce((acc, all) => {
                            if (all.data().votedFor) {
                              return acc + 1;
                            }
                            return acc;
                          }, 0) !== player.length
                            ? "#000"
                            : "#fff",
                      }}
                    >
                      {
                        player.reduce((acc, all) => {
                          if (all.data().votedFor) {
                            return acc + 1; // Erhöht den Zähler um eins, wenn chosenCharacter gesetzt ist
                          }
                          return acc; // Lässt den Zähler unverändert, wenn chosenCharacter nicht gesetzt ist
                        }, 0) // Startwert des Zählers ist 0
                      }
                      /{player.length}
                    </Text>
                    <Image
                      source={require("../../assets/play.png")}
                      resizeMode="contain"
                      style={{
                        width: 15,
                        height: 15,
                        tintColor:
                          player.reduce((acc, all) => {
                            if (all.data().votedFor) {
                              return acc + 1;
                            }
                            return acc;
                          }, 0) !== player.length
                            ? "#000"
                            : "#fff",
                      }}
                    />
                  </TouchableOpacity>
                )}
                <View style={{ backgroundColor: "#fff", borderRadius: 20 }}>
                  <Text
                    style={{
                      color: "#191919",
                      fontSize: 18,
                      fontWeight: "900",
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                    }}
                  >
                    IMPOSTOR!
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={voteForPlayer}
                  disabled={votedFor === "" || votedFor === "done"}
                  style={{
                    position: "absolute",
                    right: 15,
                    paddingHorizontal: 23,
                    paddingVertical: 12,
                    backgroundColor:
                      votedFor === "" || votedFor === "done"
                        ? "#5a5a5a"
                        : "#59CE8F",
                    borderRadius: 25,
                  }}
                >
                  <Image
                    source={require("../../assets/check.png")}
                    resizeMode="contain"
                    style={{
                      width: 25,
                      height: 15,
                      tintColor: votedFor === "" ? "#000" : "#fff",
                    }}
                  />
                </TouchableOpacity>
              </View>
            )}
            {/* IMPOSTOR LAST CHANCE */}
            {game.status === 4 && (
              <View style={{ backgroundColor: "#fff", borderRadius: 20 }}>
                <Text
                  style={{
                    color: "#191919",
                    fontSize: 18,
                    fontWeight: "900",
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                  }}
                >
                  IMPOSTOR!
                </Text>
              </View>
            )}
            {/* GAME DONE */}
            {game.status === 5 && (
              <View
                style={{
                  width: Screen.width,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  onPress={() => exitRoom()}
                  style={{
                    position: "absolute",
                    left: 15,
                    paddingHorizontal: 20,
                    paddingVertical: 9,
                    backgroundColor: "#191919",
                    borderRadius: 25,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                  >
                    Exit
                  </Text>
                </TouchableOpacity>
                <View style={{ backgroundColor: "#fff", borderRadius: 20 }}>
                  <Text
                    style={{
                      color: "#191919",
                      fontSize: 18,
                      fontWeight: "900",
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                    }}
                  >
                    IMPOSTOR!
                  </Text>
                </View>
              </View>
            )}
            {/* VOTING */}
            {game.status === 6 && (
              <View
                style={{
                  width: Screen.width,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View style={{ backgroundColor: "#fff", borderRadius: 20 }}>
                  <Text
                    style={{
                      color: "#191919",
                      fontSize: 18,
                      fontWeight: "900",
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                    }}
                  >
                    IMPOSTOR!
                  </Text>
                </View>
              </View>
            )}
          </View>
          {/* BODY */}
          <View
            style={{
              backgroundColor: "#191919",
              flex: 1,
              width: Screen.width,
              alignItems: "center",
            }}
          >
            {/* Lobby */}
            {game.status === 0 && (
              <ScrollView
                style={{ width: Screen.width }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ alignItems: "center" }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "600",
                    marginVertical: 25,
                    fontSize: 18,
                  }}
                >
                  {game.createdBy === myID
                    ? "Anzahl der Spieler: "
                    : "Warte bis der Host das Spiel startet!"}
                  {game.createdBy === myID && player.length}
                </Text>
                <View
                  style={{
                    width: "95%",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {player.map((p) => {
                    return (
                      <View
                        key={p.id}
                        style={{
                          backgroundColor: "#F5F5F5",
                          width: "48%",
                          height: Screen.width / 1.9,
                          marginBottom: 15,
                          borderRadius: 15,
                          alignItems: "center",
                        }}
                      >
                        <Image
                          source={avatars[p.data().avatar]}
                          resizeMode="contain"
                          style={{
                            width: Screen.width / 3,
                            height: Screen.width / 3,
                            borderRadius: 1000,
                            marginTop: 15,
                          }}
                        />
                        <Text
                          numberOfLines={2}
                          style={{
                            fontSize: 17,
                            marginTop: 12,
                            marginHorizontal: 5,
                            color: "#171717",
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        >
                          {p.data().name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={{ height: 100, width: 5 }} />
              </ScrollView>
            )}
            {/* Waiting for Word */}
            {game.status === 1 && (
              <View
                style={{
                  alignItems: "center",
                  width: Screen.width,
                  marginTop: 35,
                  flex: 1,
                }}
              >
                <Text
                  style={{ fontSize: 20, fontWeight: "700", color: "#fff" }}
                >
                  {game.impostor === myID ? "DU BIST DER" : "DU BIST EIN"}
                </Text>
                <Text
                  style={{
                    marginTop: game.impostor === myID ? 5 : 15,
                    fontWeight: game.impostor === myID ? "900" : "700",
                    color: game.impostor === myID ? "#D71313" : "#BAD7E9",
                    fontSize:
                      game.impostor === myID
                        ? Screen.width / 6
                        : Screen.width / 5,
                    fontFamily: game.impostor === myID ? "Horror" : "Good",
                    paddingHorizontal: 25,
                  }}
                >
                  {game.impostor === myID ? "IMPOSTOR!" : "CREWMATE!"}
                </Text>
                <View style={{ width: Screen.width / 1.1, marginTop: 15 }}>
                  {/* SPIELER IST NORMALER CREWMATE */}
                  {game.impostor !== myID && game.wordChooser !== myID && (
                    <Text
                      style={{
                        textAlign: "center",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      Du wirst als Nächstes von deinem Crewmate, der sich das
                      Stichwort aussuchen darf, ein Wort bekommen, welches du
                      umschreiben musst.
                    </Text>
                  )}
                  {/* SPIELER IST CREWMATE UND WORDCHOOSER*/}
                  {game.impostor !== myID && game.wordChooser === myID && (
                    <TouchableWithoutFeedback
                      onPress={Keyboard.dismiss}
                      accessible={false}
                    >
                      <View style={{ alignItems: "center" }}>
                        <Text
                          style={{
                            textAlign: "center",
                            color: "#fff",
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                        >
                          Zusätzlich bist du der Wortwähler! Wähle ein
                          Stichwort, das du gemeinsam mit deinen Crewmates
                          umschreiben sollst.{" "}
                        </Text>
                        <TextInput
                          value={chosenWord}
                          onChangeText={setChosenWord}
                          placeholder="Stichwort"
                          style={{
                            height: 60,
                            borderColor: "#BAD7E9",
                            borderWidth: 3,
                            borderRadius: 20,
                            backgroundColor: "#fff",
                            width: Screen.width / 1.2,
                            marginTop: 25,
                            paddingHorizontal: 15,
                            fontSize: 24,
                            fontWeight: "700",
                          }}
                          // Weitere props wie keyboardType können je nach Bedarf hinzugefügt werden
                        />
                      </View>
                    </TouchableWithoutFeedback>
                  )}
                  {/* SPIELER IST IMPOSTER*/}
                  {game.impostor === myID && (
                    <Text
                      style={{
                        textAlign: "center",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      Deine Aufgabe ist es, so zu tun, als würdest du das
                      Stichwort kennen und es mit den anderen umschreiben.
                    </Text>
                  )}
                  {game.wordChooser !== myID && (
                    <Text
                      style={{
                        textAlign: "center",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "600",
                        marginTop: 20,
                      }}
                    >
                      Warte bis der Crewmate das Wort ausgesucht hat!
                    </Text>
                  )}
                </View>
                {game.wordChooser === myID && (
                  <TouchableOpacity
                    disabled={chosenWord === ""}
                    onPress={handleAdminNext}
                    style={{
                      position: "absolute",
                      bottom: 120,
                      backgroundColor:
                        chosenWord !== "" ? "#59CE8F" : "#5a5a5a",
                      width: Screen.width / 1.5,
                      height: 60,
                      borderRadius: 30,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: "Good",
                        fontSize: 32,
                        paddingVertical: 0,
                        height: 26,
                      }}
                    >
                      START
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {/* Game! */}
            {game.status === 2 && (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  width: Screen.width / 1.1,
                }}
              >
                {/* Game Information */}
                <View
                  style={{
                    backgroundColor: "#fff",
                    height: 60,
                    flexDirection: "row",
                    justifyContent: "space-around",
                    width: "100%",
                    marginTop: 15,
                    borderRadius: 30,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Good",
                      fontSize: 30,
                      height: 24,
                      color: "#494953",
                    }}
                  >
                    Runde: {game.round}/3
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Good",
                      fontSize: 30,
                      height: 24,
                      color: "#494953",
                    }}
                  >
                    Spieler: {game.currentPlayer + 1}/{player.length}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "#fff",
                    width: "100%",
                    marginTop: 15,
                    borderRadius: 30,
                    alignItems: "center",
                  }}
                >
                  {game.playerSequence[game.currentPlayer] === myID && (
                    <View style={{ alignItems: "center", marginTop: 20 }}>
                      <Image
                        source={avatars[avatar]}
                        resizeMode="contain"
                        style={{
                          width: Screen.width / 2,
                          height: Screen.width / 2,
                          borderRadius: Screen.width / 3,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 26,
                          fontWeight: "700",
                          marginVertical: 20,
                          color: "#29252C",
                        }}
                      >
                        {name} ist dran!
                      </Text>
                    </View>
                  )}
                  {game.playerSequence[game.currentPlayer] !== myID && (
                    <View style={{ alignItems: "center", marginTop: 20 }}>
                      {player.map((p) => {
                        if (p.id === game.playerSequence[game.currentPlayer]) {
                          return (
                            <View key={p.id} style={{ alignItems: "center" }}>
                              <Image
                                source={avatars[p.data().avatar]}
                                resizeMode="contain"
                                style={{
                                  width: Screen.width / 2,
                                  height: Screen.width / 2,
                                  borderRadius: Screen.width / 3,
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: 26,
                                  fontWeight: "700",
                                  marginVertical: 20,
                                  color: "#29252C",
                                }}
                              >
                                {p.data().name} ist dran!
                              </Text>
                            </View>
                          );
                        }
                      })}
                    </View>
                  )}
                </View>
                {game.impostor !== myID && (
                  <View
                    style={{
                      width: "100%",
                      backgroundColor: "#fff",
                      marginTop: 15,
                      borderRadius: 30,
                      alignItems: "center",
                      paddingVertical: 15,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: "#494953",
                      }}
                    >
                      Das Stichwort lautet:
                    </Text>
                    <Text
                      style={{
                        fontSize: 30,
                        marginTop: 5,
                        fontWeight: "700",
                        color: "#29252C",
                      }}
                    >
                      {game.chosenWord}
                    </Text>
                  </View>
                )}
                {game.impostor === myID && (
                  <View
                    style={{
                      width: "100%",
                      backgroundColor: "#fff",
                      marginTop: 15,
                      borderRadius: 30,
                      alignItems: "center",
                      paddingVertical: 15,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: "#494953",
                      }}
                    >
                      Du bist der:
                    </Text>
                    <Text
                      style={{
                        fontSize: 30,
                        marginTop: 5,
                        fontWeight: "900",
                        color: "#FF1E00",
                      }}
                    >
                      IMPOSTOR!
                    </Text>
                  </View>
                )}
                {game.playerSequence[game.currentPlayer] === myID && (
                  <TouchableOpacity
                    onPress={nextPlayersTurn}
                    style={{
                      width: "100%",
                      height: 60,
                      backgroundColor: "#59CE8F",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop: 15,
                      borderRadius: 30,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Good",
                        fontSize: 30,
                        height: 24,
                        color: "#fff",
                      }}
                    >
                      weiter
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {/* Voting */}
            {game.status === 3 && (
              <View
                style={{
                  alignItems: "center",
                  width: Screen.width / 1.1,
                  flex: 1,
                }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: "center" }}
                >
                  <Text
                    style={{
                      marginVertical: 25,
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: 20,
                    }}
                  >
                    Wer ist der Impostor?
                  </Text>
                  {player.map((p) => {
                    return (
                      <View
                        key={p.id}
                        style={{
                          width: Screen.width / 1.1,
                          backgroundColor: "#fff",
                          height: 100,
                          marginBottom: 15,
                          borderRadius: 15,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Image
                          source={avatars[p.data().avatar]}
                          resizeMode="contain"
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            marginLeft: 10,
                          }}
                        />
                        <View style={{ marginLeft: 10 }}>
                          <Text style={{ fontSize: 18, fontWeight: "600" }}>
                            {p.data().name}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              marginTop: 5,
                            }}
                          >
                            {player.map((p2) => {
                              if (p2.data().votedFor === p.id) {
                                return (
                                  <Image
                                    key={p2.id}
                                    source={avatars[p2.data().avatar]}
                                    resizeMode="contain"
                                    style={{
                                      width: 25,
                                      height: 25,
                                      borderRadius: 15,
                                      marginRight: 4,
                                    }}
                                  />
                                );
                              }
                            })}
                          </View>
                        </View>
                        {(votedFor === "" || votedFor === p.id) && (
                          <TouchableOpacity
                            onPress={() => {
                              if (votedFor === p.id) {
                                setVotedFor("");
                              } else {
                                setVotedFor(p.id);
                              }
                            }}
                            style={{
                              paddingHorizontal: 20,
                              paddingVertical: 10,
                              backgroundColor:
                                votedFor === p.id ? "#FF7676" : "#5DAE8B",
                              borderRadius: 20,
                              position: "absolute",
                              right: 15,
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 16,
                                fontWeight: "700",
                              }}
                            >
                              {votedFor !== "" ? "Confirm?" : "Vote"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                  >
                    {player.reduce((acc, all) => {
                      if (all.data().votedFor) {
                        return acc + 1;
                      }
                      return acc;
                    }, 0)}{" "}
                    von {player.length} haben gewählt
                  </Text>
                  <View style={{ height: 100 }} />
                </ScrollView>
              </View>
            )}
            {/* Imposter Last chance! */}
            {game.status === 4 && (
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 40,
                    height: 33,

                    fontFamily: "Good",
                    marginTop: 25,
                  }}
                >
                  Ihr habt den Imposter!
                </Text>
                {player.map((impostor) => {
                  if (impostor.id === game.impostor) {
                    return (
                      <View
                        key={impostor.id}
                        style={{
                          alignItems: "center",
                          padding: 15,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "600",
                            color: "#fff",
                            marginBottom: 15,
                            textAlign: "center",
                          }}
                        >
                          Der Impostor ist {impostor.data().name}!
                        </Text>
                        <Image
                          source={avatars[impostor.data().avatar]}
                          resizeMode="contain"
                          style={{
                            width: Screen.width / 2,
                            height: Screen.width / 2,
                            borderRadius: Screen.width / 2,
                            marginBottom: 20,
                          }}
                        />
                        <Text
                          style={{
                            textAlign: "center",
                            fontWeight: "500",
                            color: "#fff",
                          }}
                        >
                          Der Impostor hat jetzt die Chance mit einem Versuch
                          das Stichwort zu erraten. Sollte das erratene Wort
                          korrekt sein, haben die Crewmates verloren. Hofft
                          also, dass ihr es geschafft habt, ihn wirklich im
                          Dunkeln tappen zu lassen!
                        </Text>
                      </View>
                    );
                  }
                })}
                {game.wordChooser === myID && (
                  <View
                    style={{
                      width: Screen.width / 1.1,
                      height: 60,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 15,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => impostorLastChance("correct")}
                      style={{
                        width: "48%",
                        height: 60,
                        backgroundColor: "#59CE8F",
                        borderRadius: 15,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 30,
                          height: 24,
                          fontFamily: "Good",
                          color: "#fff",
                        }}
                      >
                        Richtig
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => impostorLastChance("wrong")}
                      style={{
                        width: "48%",
                        height: 60,
                        backgroundColor: "#F05454",
                        borderRadius: 15,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 30,
                          height: 24,
                          fontFamily: "Good",
                          color: "#fff",
                        }}
                      >
                        Falsch
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {game.impostor !== myID && (
                  <View
                    style={{
                      width: Screen.width / 1.1,
                      padding: 15,
                      backgroundColor: "#fff",
                      marginTop: 15,
                      alignItems: "center",
                      borderRadius: 15,
                    }}
                  >
                    <Text style={{ fontSize: 12, textAlign: "center" }}>
                      Das Stichwort wurde gewählt von{" "}
                      {player.map((woCh) => {
                        if (game.wordChooser === woCh.id) {
                          return woCh.data().name;
                        }
                      })}
                    </Text>
                    <Text
                      style={{ marginTop: 7, fontSize: 26, fontWeight: "600" }}
                    >
                      {game.chosenWord}
                    </Text>
                  </View>
                )}
                {game.impostor === myID && (
                  <View
                    style={{
                      width: Screen.width / 1.1,
                      padding: 15,
                      backgroundColor: "#fff",
                      marginTop: 15,
                      alignItems: "center",
                      borderRadius: 15,
                    }}
                  >
                    <Text
                      style={{ fontSize: 24, fontWeight: "800", color: "#f00" }}
                    >
                      DU BIST DER IMPOSTOR
                    </Text>
                  </View>
                )}
              </View>
            )}
            {/* GAME DONE */}
            {game.status === 5 && (
              <View style={{ flex: 1, alignItems: "center" }}>
                {game.winner === "impostor" && game.impostor === myID && (
                  <View
                    style={{
                      marginTop: 25,
                      alignItems: "center",
                      paddingHorizontal: 15,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Good",
                        fontSize: 50,
                        color: "#fff",
                        height: 40,
                        color: "#A6D0DD",
                      }}
                    >
                      GEWONNEN!
                    </Text>
                    <Text
                      style={{
                        marginTop: 15,
                        color: "#fff",
                        fontWeight: "600",
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      Der Impostor hat das Spiel für sich entschieden.
                    </Text>
                    <View
                      style={{
                        marginTop: 25,
                        flexDirection: "row",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {player.map((impostor) => {
                        if (impostor.id === game.impostor) {
                          return (
                            <View
                              key={impostor.id}
                              style={{
                                padding: 3,
                                borderRadius: 100,
                                backgroundColor: "#fff",
                              }}
                            >
                              <Image
                                source={avatars[impostor.data().avatar]}
                                resizeMode="contain"
                                style={{
                                  width: Screen.width / 4,
                                  height: Screen.width / 4,
                                  borderRadius: Screen.width / 4,
                                }}
                              />
                            </View>
                          );
                        }
                      })}
                    </View>
                  </View>
                )}
                {game.winner === "crewmate" && game.impostor !== myID && (
                  <View
                    style={{
                      marginTop: 25,
                      alignItems: "center",
                      paddingHorizontal: 15,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Good",
                        fontSize: 50,
                        color: "#fff",
                        height: 40,
                        color: "#A6D0DD",
                      }}
                    >
                      GEWONNEN!
                    </Text>
                    <Text
                      style={{
                        marginTop: 15,
                        color: "#fff",
                        fontWeight: "600",
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      Die Crewmates haben das Spiel für sich entschieden.
                    </Text>
                    <View
                      style={{
                        marginTop: 25,
                        flexDirection: "row",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {player.map((crewmates, index) => {
                        if (crewmates.id !== game.impostor) {
                          return (
                            <View
                              key={crewmates.id}
                              style={{
                                padding: 3,
                                borderRadius: 100,
                                backgroundColor: "#fff",
                                marginLeft:
                                  index !== 0 ? -(Screen.width / 5) / 2 : 0,
                              }}
                            >
                              <Image
                                source={avatars[crewmates.data().avatar]}
                                resizeMode="contain"
                                style={{
                                  width: Screen.width / 4,
                                  height: Screen.width / 4,
                                  borderRadius: Screen.width / 4,
                                }}
                              />
                            </View>
                          );
                        }
                      })}
                    </View>
                  </View>
                )}
                {game.winner === "impostor" && game.impostor !== myID && (
                  <View style={{ marginTop: 25, alignItems: "center" }}>
                    <Text
                      style={{
                        fontFamily: "Horror",
                        fontSize: 40,
                        height: 65,
                        paddingHorizontal: 15,
                        color: "#f00",
                      }}
                    >
                      Verloren!
                    </Text>
                    <Text
                      style={{
                        marginTop: 15,
                        color: "#fff",
                        fontWeight: "600",
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      Der Impostor hat das Spiel für sich entschieden.
                    </Text>
                    <View
                      style={{
                        marginTop: 25,
                        flexDirection: "row",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {player.map((impostor) => {
                        if (impostor.id === game.impostor) {
                          return (
                            <View
                              key={impostor.id}
                              style={{
                                padding: 3,
                                borderRadius: 100,
                                backgroundColor: "#fff",
                              }}
                            >
                              <Image
                                source={avatars[impostor.data().avatar]}
                                resizeMode="contain"
                                style={{
                                  width: Screen.width / 4,
                                  height: Screen.width / 4,
                                  borderRadius: Screen.width / 4,
                                }}
                              />
                            </View>
                          );
                        }
                      })}
                    </View>
                  </View>
                )}
                {game.winner === "crewmate" && game.impostor === myID && (
                  <View style={{ marginTop: 25, alignItems: "center" }}>
                    <Text
                      style={{
                        fontFamily: "Horror",
                        fontSize: 40,
                        height: 65,
                        paddingHorizontal: 15,
                        color: "#f00",
                      }}
                    >
                      Verloren!
                    </Text>
                    <Text
                      style={{
                        marginTop: 15,
                        color: "#fff",
                        fontWeight: "600",
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      Die Crewmates haben das Spiel für sich entschieden.
                    </Text>
                    <View
                      style={{
                        marginTop: 25,
                        flexDirection: "row",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {player.map((crewmates, index) => {
                        if (crewmates.id !== game.impostor) {
                          return (
                            <View
                              key={crewmates.id}
                              style={{
                                padding: 3,
                                borderRadius: 100,
                                backgroundColor: "#fff",
                                marginLeft:
                                  index !== 0 ? -(Screen.width / 5) / 2 : 0,
                              }}
                            >
                              <Image
                                source={avatars[crewmates.data().avatar]}
                                resizeMode="contain"
                                style={{
                                  width: Screen.width / 4,
                                  height: Screen.width / 4,
                                  borderRadius: Screen.width / 4,
                                }}
                              />
                            </View>
                          );
                        }
                      })}
                    </View>
                  </View>
                )}
                {game.createdBy === myID && (
                  <TouchableOpacity
                    onPress={backToTheLobby}
                    style={{
                      marginTop: 35,
                      width: Screen.width / 1.3,
                      height: 60,
                      backgroundColor: "#59CE8F",
                      borderRadius: 30,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: "Good",
                        fontSize: 30,
                        height: 24,
                      }}
                    >
                      Nochmal spielen
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {/* Unentschieden Vote! */}
            {game.status === 6 && (
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Good",
                    fontSize: 40,
                    color: "#f00",
                    marginTop: 25,
                    height: 32,
                  }}
                >
                  Voting unentschieden!
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#fff",
                    fontWeight: "600",
                    marginTop: 15,
                  }}
                >
                  Das Voting darf nicht unentschieden sein!
                </Text>
                {game.createdBy === myID && (
                  <TouchableOpacity
                    onPress={backToVote}
                    style={{
                      marginTop: 100,
                      width: Screen.width / 1.3,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: "#59CE8F",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ fontSize: 20, fontWeight: "600", color: "#fff" }}
                    >
                      Nochmal Voten
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
};

export default ImposterRoom;
