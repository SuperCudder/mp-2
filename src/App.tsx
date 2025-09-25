import MapView from "./MapView.tsx";
import {useEffect, useState} from "react";
import {guessGame} from "./game.ts";
import styled from "styled-components";

function App() { /*tsx func to load scripts into webapp*/
    const [imageId, setImageId] = useState<string | null>(null); /*store data for current round's Mapillary img, start at null and update*/
    const [gameReady, setGameReady] = useState(false); /*keep people from spamming new rounds before a new one is loaded*/

    useEffect(() => { /*hook with listener for custom events: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent*/
        const handleUpdateMapImg = (event: CustomEvent) => { /*extract img id from event and update the current rounds image id*/
            setImageId(event.detail.imageId);
        };
        /*listener for window obj, casts typed handler to a generic listener for compatability*/
        window.addEventListener("updateMapImg", handleUpdateMapImg as EventListener);

        return () => { /*cleanup, react runs when component is unmounted to remove event listener*/
            window.removeEventListener("updateMapImg", handleUpdateMapImg as EventListener);
        };
    }, []); /*empty arr so effect never reruns after initial mount*/

    /*initialization hook for first round of the game, runs only once when react is mounting*/
    useEffect(() => {
        /* initialize the first game round */
        async function initGame() {
            await guessGame();
            setGameReady(true);
        }

        initGame();
    }, []); /*empty arr to make sure this only runs on init*/

    /*new round button click, lets users skip a round if broken or for any reason really*/
    const handleNewRound = async () => {
        setGameReady(false); /*this just gives a visual queue that its already running*/
        await guessGame();
        setGameReady(true);
    };

    const NRButton = styled.button`
        padding: 15px 25px;
        font-size: 16px;
        background-color: #FF7D00;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.3s;
        color: #FAF3E0;
        &:hover {
            background-color: #1A1A1A;
        }`;

    /*render logic for react*/
    return (
        <div className="App">
            <h3>Click the arrow on the screen to begin</h3>
            {/*this is some cool conditional rendering, only shows loading msg until first img is available*/}
            {imageId ? (
                /*once we have an img id render game view*/
                <>
                    {/*render mapview and pass current img id as prop*/}
                    <MapView imageId={imageId}/>
                    {/* provide the next round button only if game is ready */}
                    {gameReady && (
                        <div style={{marginTop: '20px', textAlign: 'center'}}>
                            <NRButton onClick={handleNewRound}>Next Round</NRButton>
                        </div>
                    )}
                </>
            ) : (
                /*display msg while init round is starting up*/
                <p>Loading...</p>
            )}
        </div>
    );
}

export default App;