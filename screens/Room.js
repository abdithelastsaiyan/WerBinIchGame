import React, { useEffect, useLayoutEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Image, ScrollView, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native'
// Navigation
import { useNavigation } from '@react-navigation/native';
// Firebase
import { getFirestore, collection, onSnapshot, query, doc, setDoc, updateDoc } from "firebase/firestore";
// Helpers
import Screen, { safeArea } from '../helpers/Screen';
import { avatars } from '../helpers/Avatars';
import haptic from '../helpers/Haptics'


const Room = (data) => {

    // Navigation
    const navigation = useNavigation()

    // Firebase
    const database = getFirestore()

    //State Variables
    const myID = data.route.params.userID
    const room = data.route.params.roomID
    const [game, setGame] = useState()
    const [player, setPlayer] = useState()
    const [isLoading, setIsLoading] = useState(true)
    const [userSelect, setUserSelect] = useState()
    const [answering, setAnswering] = useState()
    const [yourCharacter, setYourCharacter] = useState("")
    const [characterChosen, setCharacterChosen] = useState(false)
    const [notes, setNotes] = useState("")
    const [questCounter, setQuestCounter] = useState(0) 


    // Functions
    // Handles the Name choosing at Status 1 for every player
    const handleNameChoose = async () => {
        if(!characterChosen){
            const docRef = doc(database, "rooms", room, "player", myID)
            await updateDoc(docRef, {
                chosenCharacter: yourCharacter,
                questionsAsked: 0,
                guessRight: false
            }).then(
                setCharacterChosen(true),
                console.log("Du hast" + characterChosen + "gewählt!")
            )
        }else{
            console.log("Du hast schon!")
        }
    }

    // Handles Admin Settings at Status 0 
    const handleZuweisung = async (forPlayer) => {
        const docRef = doc(database, "rooms", room, "player", forPlayer)
        await updateDoc(docRef, {
            hasChosenFor: answering
        })
    }

    // Handles Next Button ADMIN ONLY
    const handleAdminNext = async () => {
        const gameRef = doc(database, "rooms", room)
        if(game.status === 0){
            await updateDoc(gameRef, {
                status: 1
            })
        }
        if(game.status === 1 && characterChosen){
            await updateDoc(gameRef, {
                status: 2,
                answering: player[0].id,
                asking: player[0].data().hasChosenFor
            })
        }
    }

    // Handle Yes if a question was right
    const handleYes = () => {
        player.map((count) => {
            if(count.id === game.answering){
                pushYes(count.data().questionsAsked + 1)
            }
        })
    }
    const pushYes = async (newCount) => {
        const docRef = doc(database, "rooms", room, "player", game.answering)
        await updateDoc(docRef, {
            questionsAsked: newCount
        })
        .then(haptic("normal"))
    }

    // Handle No if Question Wrong and next player
    const handleNo = () => {
        player.map((nowAnswerer, index) => {
            if(nowAnswerer.id === game.answering){
                if(index + 1 < player.length){
                    pushNo(nowAnswerer.data().questionsAsked + 1, player[index + 1].id, player[index + 1].data().hasChosenFor)
                }else{
                    pushNo(nowAnswerer.data().questionsAsked + 1, player[0].id, player[0].data().hasChosenFor)
                    nextRound()
                }
            }
        })
    }
    const pushNo = async (newCount, nextAnswerer, nextAsking) => {
        const docRef = doc(database, "rooms", room, "player", game.answering)
        const gameRef = doc(database, "rooms", room)
        await updateDoc(docRef, {
            questionsAsked: newCount
        })
        await updateDoc(gameRef, {
            answering: nextAnswerer,
            asking: nextAsking
        })
        .then(haptic("normal"))
    }
    const nextRound = () => {
        const gameRef = doc(database, "rooms", room)
        updateDoc(gameRef, {
            round: game.round + 1
        })
    }

    // Data Fetchers
    const getPlayerInfo = (playerID) => {
        player.forEach((p) => {
            if(p.id === playerID){
                console.log(p.data())
                return p.data()
            }
        })
    }

    useEffect(() => {
        const unsub = onSnapshot(doc(database, "rooms", room), (doc) => {
            setGame(doc.data())
            console.log("es ist was passiert!")
        });
        return unsub
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
        return unsubscribe
    }, []);

    return(
        <View style={[safeArea.AndroidAndIOSSafeArea ,{flex: 1, width: Screen.width, backgroundColor: '#fff', paddingBottom: 10}]}>
            {player && !isLoading && (
            <View style={{flex: 1, width: Screen.width, backgroundColor: '#fff'}}>
                {/* HEADER */}
                <View style={{width: Screen.width, height: 70, alignItems: 'center', justifyContent: 'center'}}>
                    {game.status === 0 && (
                        <Text style={{color: '#3a3a3a', fontSize: 18, fontWeight: '600'}}>Waiting for Host to Start</Text>
                    )}
                    {game.status === 1 && (
                        <Text style={{color: '#3a3a3a', fontSize: 18, fontWeight: '600'}}>Wähle deine Person!</Text>
                    )}
                    {game.status === 2 && (
                        <Text style={{color: '#3a3a3a', fontSize: 18, fontWeight: '600'}}>{
                            player.map((take) => {if(game.asking === take.id){
                                return(take.data().name)
                            }})
                        } ist dran zu Fragen</Text>
                    )}
                </View>
                {/* BODY */}
                {game.status === 0 && (
                    <ScrollView style={{ backgroundColor: '#ffe8d6', width: Screen.width}} contentContainerStyle={{alignItems: 'center'}}>
                        <Text style={{marginTop: 20, color: '#3a3a3a', fontSize: 17}}>Current Players: {myID}</Text>
                        {player.map((p) => {
                            return(
                                <View key={p.id}>
                                    <View 
                                        onPress={() => {if(game.createdBy === myID){setUserSelect(p.id)}}}
                                        activeOpacity={0.7}
                                        style={{width: Screen.width / 1.1, height: 80, backgroundColor: '#fff', borderRadius: 40, marginTop: 20, flexDirection: 'row', alignItems: 'center'}}
                                    >
                                        <Image 
                                            source={avatars[p.data().avatar]}
                                            resizeMode='contain'
                                            style={{width: 70, height: 70, borderRadius: 35, marginLeft: 5}}
                                        />
                                        <Text style={{marginLeft: 10, color: '#3a3a3a', fontSize: 16, fontWeight: '500'}}>{p.data().name}</Text>
                                        
                                        {p.data().hasChosenFor && 
                                        <View style={{position: 'absolute', right: 25, height: 80, justifyContent: 'center'}}>
                                            {player.map((answering) => {
                                                if(answering.id === p.data().hasChosenFor){
                                                return(
                                                    <View key={answering.id}>
                                                        <Text style={{fontSize: 10}}>Wählt einen Charakter für:</Text>
                                                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                                                            <Image
                                                                source={avatars[answering.data().avatar]}
                                                                resizeMode='contain'
                                                                style={{width: 30, height: 30, borderRadius: 20}}
                                                            />
                                                            <Text>  {answering.data().name}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            })}
                                        </View>}
                                    </View>
                                    {myID === game.createdBy && (
                                        <View style={{width: Screen.width / 1.1, height: 150, backgroundColor: '#fff',  borderRadius: 20, flexDirection: 'row', alignItems: 'center'}}>
                                            <View style={{flexDirection: 'row', flexWrap: 'wrap', width: '50%', height: '90%',}}>
                                                {player.map((p) => {
                                                    return(
                                                        <TouchableOpacity key={p.id} onPress={() => { setAnswering(p.id) }} style={{ marginLeft: 5, marginBottom: 5}}>
                                                            <Image 
                                                                source={avatars[p.data().avatar]}
                                                                resizeMode='contain'
                                                                style={{width: 40, height: 40, borderRadius: 20}}
                                                            />
                                                        </TouchableOpacity>
                                                    )
                                                })}
                                            </View>
                                            <View>
                                                <TouchableOpacity onPress={() => handleZuweisung(p.id)} style={{width: 150, height: 50, backgroundColor: '#0f0', borderRadius: 10, marginTop: 5, alignItems: 'center', justifyContent: 'center'}}>
                                                    <Text>DONE</Text>
                                                </TouchableOpacity> 
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )
                        })}
                        {myID === game.createdBy && (
                            <TouchableOpacity onPress={handleAdminNext} style={{width: 200, height: 60, backgroundColor: '#f00', borderRadius: 30, marginVertical: 50, alignItems: 'center', justifyContent: 'center'}}>
                                <Text style={{color: '#fff', fontSize: 24, fontWeight: '600'}}>Start</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                )}
                {game.status === 1 && (
                    <View style={{ flex: 1, backgroundColor: '#ffe8d6', width: Screen.width, alignItems: 'center'}}>
                        {player.map((yourP) => {
                            if(myID === yourP.id){
                                return(
                                <View key={yourP.id} style={{marginTop: 25, alignItems: 'center'}}>
                                    {player.map((myGuy)=>{if(myGuy.id === yourP.data().hasChosenFor){
                                        return(
                                            <View key={myGuy.id} style={{alignItems: 'center'}}>
                                                <Text style={{color: '#3a3a3a', fontSize: 18, fontWeight: '500', marginBottom: 45}}>Such dir einen Charakter für {myGuy.data().name} aus!</Text>
                                                <Image 
                                                    source={avatars[myGuy.data().avatar]}
                                                    resizeMode='contain'
                                                    style={{width: Screen.width / 2, height: Screen.width / 2, borderRadius: Screen.width / 2.5, marginBottom: 35}}
                                                />
                                                <Text style={{fontSize: 18, marginBottom: 5, fontWeight: '600', color: '#3a3a3a', height: 20}}>{myGuy.data().name} ist:</Text>
                                                <Text style={{fontSize: 24, marginBottom: 25, fontWeight: '600', color: '#3a3a3a', height: 28}}>{yourCharacter}</Text>
                                                <TextInput 
                                                    style={{
                                                        width: Screen.width / 1.3,
                                                        padding: 15,
                                                        borderWidth: 2.5,
                                                        borderColor: '#5a5a5a',
                                                        borderRadius: 15,
                                                        fontWeight: "600",
                                                        marginBottom: 45,
                                                        fontSize: 18,
                                                        color: '#3a3a3a'
                                                    }}
                                                    placeholder="Deine Wahl"
                                                    placeholderTextColor={"#6a6a6a"}
                                                    value={yourCharacter}
                                                    autoCorrect={false}
                                                    returnKeyType="done"
                                                    onChangeText={(name) => setYourCharacter(name)}
                                                />
                                                {!characterChosen && (
                                                    <TouchableOpacity 
                                                        onPress={handleNameChoose}
                                                        disabled={!characterChosen && yourCharacter === "" ? true : false}
                                                        style={{width: Screen.width / 1.5, height: 60, borderRadius: 25, backgroundColor: yourCharacter !== "" ? '#995e57' : "#3a3a3a", alignItems: 'center', justifyContent: 'center'}}
                                                    >
                                                        <Text style={{color: '#fff', fontSize: 26, fontWeight: '500'}}>FERTIG</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {characterChosen && (
                                                    <View 
                                                        style={{width: Screen.width / 1.5, height: 60, borderRadius: 25, backgroundColor: '#0f0', alignItems: 'center', justifyContent: 'center'}}
                                                    >
                                                        <Text style={{color: '#fff', fontSize: 26, fontWeight: '500'}}>FERTIG</Text>
                                                    </View>
                                                )}
                                                <Text style={{color: '#2a2a2a', fontSize: 16, fontWeight: '500', marginTop: 10}}>
                                                    {player.map((all) => {
                                                        if(all.data().chosenCharacter){
                                                            return("|")
                                                        }
                                                    })} von {player.length} sind ready
                                                </Text>        
                                            </View>
                                        )
                                    }})}
                                </View>
                                )
                            }
                        })}
                        {myID === game.createdBy && 
                            <TouchableOpacity 
                                onPress={handleAdminNext}
                                style={{width: Screen.width / 1.5, height: 60, borderRadius: 30, backgroundColor: '#f00', marginTop: 15, alignItems: 'center', justifyContent: 'center'}}
                            >
                                <Text style={{color: '#fff', fontSize: 20, fontWeight: '600'}}>START</Text>
                            </TouchableOpacity>
                        }
                    </View>
                )}
                {game.status === 2 && (
                    <View style={{ backgroundColor: '#ffe8d6', width: Screen.width, flex: 1}}>
                        {game.asking === myID && (
                        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                            <View style={{width: Screen.width, height: Screen.width / 3.5, backgroundColor: '#ffffff99', flexDirection: 'row', alignItems: 'center'}}>
                                <View style={{width: Screen.width / 6, height: Screen.width / 5, backgroundColor: '#555', borderRadius: 15, marginLeft: 15, alignItems: 'center', justifyContent: 'center'}}>
                                    <Text style={{fontSize: 45, fontWeight: '600', color: '#fff'}}>?</Text>
                                </View>
                                <View>
                                    <Text style={{marginLeft: 20, fontSize: 28, fontWeight: '600', color: '#3a3a3a'}}>Wer bin Ich?</Text>
                                    <Text style={{marginLeft: 20, fontSize: 18, fontWeight: '600', color: '#3a3a3a'}}>Stelle deine Frage!</Text>
                                </View>
                            </View>  
                        </TouchableWithoutFeedback> 
                        )}
                        {game.asking !== myID && (
                            player.map((current) => {
                                if(current.id === game.asking){
                                    return(
                                        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                                        <View style={{width: Screen.width, height: Screen.width / 3.5, backgroundColor: '#ffffff99', flexDirection: 'row', alignItems: 'center'}}>
                                            <Image
                                                source={avatars[current.data().avatar]}
                                                resizeMode='contain'
                                                style={{width: Screen.width / 5, height: Screen.width / 5, borderRadius: 40, marginLeft: 15}}
                                            />
                                            <View>
                                                <Text style={{marginLeft: 20, fontSize: 18, fontWeight: '600', color: '#3a3a3a'}}>{current.data().name}'s Charakter ist:</Text>
                                                <Text style={{marginLeft: 20, fontSize: 28, fontWeight: '600', color: '#3a3a3a'}}>{
                                                    player.map((character) => {
                                                        if(character.id === game.answering){
                                                            return(character.data().chosenCharacter)
                                                        }
                                                    })
                                                }</Text>
                                            </View>
                                        </View> 
                                        </TouchableWithoutFeedback>   
                                    )
                                }
                            })
                        )}
                        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                            <View style={{width: Screen.width, height: 60, backgroundColor: '#ffffff10', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around'}}>
                                <Text style={{color: '#3a3a3a', fontSize: 18, fontWeight: '600'}}>{
                                    player.map((current) => {if(current.id === game.answering){return(current.data().questionsAsked)}})} Fragen gestellt</Text>
                                <Text style={{color: '#3a3a3a', fontSize: 18, fontWeight: '600'}}>Runde: {game.round}</Text>
                            </View>
                        </TouchableWithoutFeedback>
                        <TextInput 
                            style={{
                                width: Screen.width,
                                height: Screen.width,
                                paddingHorizontal: 15,
                                paddingTop: 15,
                                fontWeight: "600",
                                marginBottom: 45,
                                fontSize: 18,
                                color: '#3a3a3a',
                                backgroundColor: '#ffffff99'
                             }}
                            placeholder="Notizen"
                            placeholderTextColor={"#6a6a6a"}
                            value={notes}
                            autoCorrect={false}
                            returnKeyType="done"
                            onChangeText={(name) => setNotes(name)}
                            multiline={true}
                        />
                        {myID === game.answering && 
                        <View style={{position: 'absolute', bottom: 0, width: Screen.width, height: 155, backgroundColor: '#fff', alignItems: 'center'}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', width: Screen.width, justifyContent: 'space-evenly', marginTop: 15}}>
                                <TouchableOpacity onPress={handleYes} style={{width: '45%', height: 60, backgroundColor: '#31a102', borderRadius: 25, alignItems: 'center', justifyContent: 'center'}}>
                                    <Text style={{color: '#fff', fontSize: 25, fontWeight: '600'}}>Ja</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleNo} style={{width: '45%', height: 60, backgroundColor: '#a10207', borderRadius: 25, alignItems: 'center', justifyContent: 'center'}}>
                                    <Text style={{color: '#fff', fontSize: 25, fontWeight: '600'}}>Nein</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={handleNo} style={{width: '93%', height: 50, backgroundColor: '#f9910a', borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginTop: 15}}>
                                    <Text style={{color: '#fff', fontSize: 20, fontWeight: '600'}}>Charakter wurde erraten</Text>
                            </TouchableOpacity>
                        </View>
                        }
                    </View>
                )}
            </View> 
            )}
        </View>
    )
}

export default Room;