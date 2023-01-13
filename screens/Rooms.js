import React, {useEffect, useState} from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native'
// Navigation
import { useNavigation } from '@react-navigation/native';
// Firebase
import { getFirestore, collection, onSnapshot, query, doc, setDoc } from "firebase/firestore";
// Helpers
import Screen from '../helpers/Screen';

const Rooms = (data) => {

    // Navigation
    const navigation = useNavigation()

    // Firebase
    const database = getFirestore()

    // State Variables
    const user = data.route.params
    const [rooms, setRooms] = useState()
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false) 
    const [roomName, setRoomName] = useState("")  

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
        return unsubscribe
    }, []);

    // Functions
    const joinRoom = async (roomID) => {
        const docRef = doc(database, 'rooms', roomID, "player", user.userID)
        await setDoc(docRef, {name: user.name, avatar: user.avatar})
        .then(
            navigation.push('Room', {userID: user.userID, roomID: roomID})
        )
    }
    
    const handleCreateButton = async () => {
        if(isCreating && roomName !== ""){
            const roomRef = doc(database, 'rooms', roomName)
            await setDoc(roomRef, {createdBy: user.userID, status: 0, asking: "", answering: ""})
            .then(
                joinRoom(roomName)
            )
        }else{
            setIsCreating(true)
        }
    }

    return(
        <View style={{flex: 1, width: '100%'}}>
            <ScrollView>
                {rooms && !isLoading && (
                    <View style={{width: Screen.width, height: Screen.width, marginTop: 15, alignItems: 'center'}}>
                        {rooms.map((room) => {
                            return(
                                <TouchableOpacity 
                                    key={room.id}
                                    onPress={() => { joinRoom(room.id) }} 
                                    activeOpacity={0.7} 
                                    style={{width: '90%', height: 80, backgroundColor: '#fff', borderRadius: 25, justifyContent: 'center', marginBottom: 10}}
                                >
                                    <Text style={{color: '#3a3a3a', fontSize: 22, fontWeight: '500', marginLeft: 15}}>{room.id}</Text>
                                    <Text style={{position: 'absolute', bottom: 5, right: 15, fontSize: 12, color: '#5a5a5a'}}>erstellt von: {room.data().createdBy}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}
            </ScrollView>
            {isCreating && (
                <View style={{width: Screen.width / 1.1, height: 80, position: 'absolute', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderRadius: 45, bottom: 115, right: 15}}>
                    <TextInput 
                        placeholder="Raum Name"
                        placeholderTextColor={"rgba(70, 70, 70, 0.6)"}
                        value={roomName}
                        autoCorrect={false}
                        returnKeyType="done"
                        onChangeText={(name) => setRoomName(name)}
                    />
                </View>
            )}
            <TouchableOpacity 
                onPress={handleCreateButton}
                style={{ borderRadius: 40, backgroundColor: '#000', position: 'absolute', bottom: 45, right: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 15}}>
                <Text style={{color: '#fff', fontSize: 20, fontWeight: '500'}}>{isCreating ? "Start" : "Raum öffnen"}</Text>
            </TouchableOpacity>
        </View>
    )
}

export default Rooms;