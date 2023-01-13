import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native'
// Firebase
import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
// Navigation
import { useNavigation } from '@react-navigation/native'
// Helpers
import Screen from '../helpers/Screen'
import { generateRandomString } from '../helpers/Utilities'
import { avatars } from '../helpers/Avatars'

const UserInfoScreen = () => {

    // Navigation
    const navigation = useNavigation()
    // Firebase

    // State Variables
    const [currentAvatar, setCurrentAvatar] = useState(0)
    const [userName, setUserName] = useState("")
    const [userID, setUserID] = useState(generateRandomString())
    const [showFail, setShowFail] = useState(false)

    // Functions
    const handleNext = () => {
        if(userName !== '' && userID){
            navigation.push('Rooms', {userID: userID, name: userName, avatar: currentAvatar})
        }else{setShowFail(true)}
    }

    const chooseAvatar = (pic) => {
        setCurrentAvatar(pic)
    }

    useEffect(() => {
        signInWithEmailAndPassword(auth, "saiyajin@server.de", "saiyajin123!")
    }, [])

    return(
        <View style={{flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe8d6'}}>
            <View style={{width: "90%", height: Screen.height / 1.5, backgroundColor: '#fff', borderRadius: 35, alignItems: 'center'}}>
                <TouchableOpacity onPress={() => {navigation.push('ChooseAvatarScreen', chooseAvatar)}} activeOpacity={0.7} style={{marginVertical: 45}} >
                    <Image
                        source={avatars[currentAvatar]}
                        resizeMode='contain'
                        style={{width: Screen.width / 2.5, height: Screen.width / 2.5, borderRadius: Screen.width / 2.5}}
                    />
                </TouchableOpacity>
                <Text style={{marginBottom: 35, fontSize: 26, fontWeight: '600',color: '#3a3a3a', height: 30}}>{userName != "" ? userName : "Dein Name"}</Text>
                <TextInput
                  style={styles.nameImput}
                  placeholder="Dein Name"
                  placeholderTextColor={"rgba(70, 70, 70, 0.6)"}
                  value={userName}
                  autoCorrect={false}
                  returnKeyType="done"
                  onChangeText={(name) => setUserName(name)}
                />
                <Text style={{color: '#f00'}}>{showFail ? "Schreib mal name lo" : ''}</Text>
                <TouchableOpacity 
                    onPress={() => handleNext()}
                    style={{width: '80%', height: 65, borderRadius: 25, backgroundColor: '#ffe8d6', position: 'absolute', bottom: 35, alignItems: 'center', justifyContent: 'center'}}
                >
                    <Text style={{color: '#3a3a3a', fontSize: 25, fontWeight: '700'}}>Start</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default UserInfoScreen;

const styles = StyleSheet.create({
    nameImput: {
        width: "85%",
        padding: 15,
        marginTop: 15,
        borderWidth: 2.5,
        borderColor: '#afafaf',
        borderRadius: 15,
        fontWeight: "400",
        marginBottom: 15,
    }
})