import React, { useEffect, useLayoutEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native'
// Navigation
import { useNavigation } from '@react-navigation/native';
// Firebase
import { getFirestore, collection, onSnapshot, query, doc, setDoc, updateDoc } from "firebase/firestore";
// Helpers
import Screen, { safeArea } from '../helpers/Screen';
import { avatars } from '../helpers/Avatars';
import { async } from '@firebase/util';


const Room = (data) => {

    // Navigation
    const navigation = useNavigation()

    // Firebase
    const database = getFirestore()

    //State Variables
    const myID = data.route.params.userID
    const room = data.route.params.roomID
    const [game, setGame] = useState()
    const [playingStatus, setPlayingStatus] = useState()
    const [isLoading, setIsLoading] = useState(true)
    const [userSelect, setUserSelect] = useState()
    const [counter, setCounter] = useState(0)
    const [answering, setAnswering] = useState()

    // Functions
    const handleZuweisung = async (forPlayer) => {
        const docRef = doc(database, "rooms", room, "player", forPlayer)
        await updateDoc(docRef, {
            line: counter,
            answering: answering
        })
    }

    const handleAdminNext = async () => {
        const gameRef = doc(database, "rooms", room)
        if(game.status === 0){
            await updateDoc(gameRef, {
                status: 1
            })
        }
        if(game.status === 1){
            await updateDoc(gameRef, {
                status: 2
            })
        }
    }

    useEffect(() => {
        const unsub = onSnapshot(doc(database, "rooms", room), (doc) => {
            setGame(doc.data())
            console.log("es ist was passiert!")
        });
        return unsub
    }, []);

    useEffect(() => {
        const player = query(collection(database, "rooms", room, "player"));
        const unsubscribe = onSnapshot(
        player,
        (snapshot) => {
            setPlayingStatus(snapshot.docs.map((doc) => doc));
            setIsLoading(false);
        },
        (error) => {
            console.log("Error fetching data: " + error.message);
        }
        );
        return unsubscribe
    }, []);

    useLayoutEffect(() => {

    }, [game.status])

    return(
        <View style={[safeArea.AndroidAndIOSSafeArea ,{flex: 1, width: Screen.width, backgroundColor: '#fff', paddingBottom: 10}]}>
            {playingStatus && !isLoading && (
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
                        <Text style={{color: '#3a3a3a', fontSize: 18, fontWeight: '600'}}>Wähle deine Person!</Text>
                    )}
                </View>
                {/* BODY */}
                {game.status === 0 && (
                    <ScrollView style={{ backgroundColor: '#ffe8d6', width: Screen.width}} contentContainerStyle={{alignItems: 'center'}}>
                        <Text style={{marginTop: 20, color: '#3a3a3a', fontSize: 17}}>Current Players:</Text>
                        {playingStatus.map((player) => {
                            return(
                                <View key={player.id}>
                                    <View 
                                        onPress={() => {if(game.createdBy === myID){setUserSelect(player.id)}}}
                                        activeOpacity={0.7}
                                        style={{width: Screen.width / 1.1, height: 80, backgroundColor: '#fff', borderRadius: 40, marginTop: 20, flexDirection: 'row', alignItems: 'center'}}
                                    >
                                        <Image 
                                            source={avatars[player.data().avatar]}
                                            resizeMode='contain'
                                            style={{width: 70, height: 70, borderRadius: 35, marginLeft: 5}}
                                        />
                                        <Text style={{marginLeft: 10, color: '#3a3a3a', fontSize: 16, fontWeight: '500'}}>{player.data().name}</Text>
                                        <Text>{player.line}</Text>
                                    </View>
                                    {myID === game.createdBy && (
                                        <View style={{width: Screen.width / 1.1, height: 150, backgroundColor: '#fff',  borderRadius: 20, flexDirection: 'row', alignItems: 'center'}}>
                                            <View style={{flexDirection: 'row', flexWrap: 'wrap', width: '50%', height: '90%',}}>
                                                {playingStatus.map((player) => {
                                                    return(
                                                        <TouchableOpacity key={player.id} onPress={() => { setAnswering(player.id) }} style={{ marginLeft: 5, marginBottom: 5}}>
                                                            <Image 
                                                                source={avatars[player.data().avatar]}
                                                                resizeMode='contain'
                                                                style={{width: 40, height: 40, borderRadius: 20}}
                                                            />
                                                        </TouchableOpacity>
                                                    )
                                                })}
                                            </View>
                                            <View>
                                                <View style={{width: 150, height: 50, backgroundColor: '#dadada', borderRadius: 10, flexDirection: 'row', alignItems: 'center'}}>
                                                    <TouchableOpacity onPress={() => {setCounter(counter - 1)}} style={{height: 50, width: '33%', alignItems: 'center'}}>
                                                        <Text style={{ textAlign: 'center', fontSize: 35}}>-</Text>
                                                    </TouchableOpacity>
                                                    <Text style={{height: 50, width: '33%', textAlign: 'center', fontSize: 35}}>{counter}</Text>
                                                    <TouchableOpacity onPress={() => {setCounter(counter + 1)}} style={{height: 50, width: '33%', alignItems: 'center'}}>
                                                        <Text style={{ textAlign: 'center', fontSize: 35}}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <TouchableOpacity onPress={() => handleZuweisung(player.id)} style={{width: 150, height: 50, backgroundColor: '#0f0', borderRadius: 10, marginTop: 5, alignItems: 'center', justifyContent: 'center'}}>
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
                                <Text>Start</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                )}
                {game.status === 1 && (
                    <View style={{ flex: 1, backgroundColor: '#ffe8d6', width: Screen.width, alignItems: 'center'}}>
                        <Image 
                            source={require()}
                        />
                    </View>
                )}
            </View> 
            )}
        </View>
    )
}

export default Room;