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
    var counter = 0
    player.map((nowAnswerer, index) => {
        if(nowAnswerer.id === game.answering){
            if(index + 1 < player.length){
                game.ranking.forEach((wplayer) => {
                    if(index + 1 !== wplayer){
                        pushNo(nowAnswerer.data().questionsAsked + 1, player[index + 1].id, player[index + 1].data().hasChosenFor)
                    }
                })
            }else{
                game.ranking.forEach((wplayer) => {
                    if(counter !== wplayer){
                        pushNo(nowAnswerer.data().questionsAsked + 1, player[0].id, player[0].data().hasChosenFor)
                    }else{
                        counter++
                    }
                })
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

const handleGuessed = () => {
    const gameRef = doc(database, "rooms", room)
    const playersIndex = player.map((p, index) => {if(p.id === game.asking){return index}})
    const array = game.ranking
    array.push(playersIndex)
    updateDoc(gameRef, {
        ranking: array
    })
    if(game.ranking.length === player.length){
        finishGame()
    }
}

const finishGame = async () => {
    const gameRef = doc(database, "rooms", room)
    updateDoc(gameRef, {
        status: 3
    })
}