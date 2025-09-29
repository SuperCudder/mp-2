import {fetchImg, getCountryName} from "./apiFetch.ts";
/*this script is designed to track player score and game state*/
let numCorrect = 0; /*num correct choices*/
let numIncorrect = 0; /*num incorrect choices*/
let currentCorrect: string | null = null; /*stores correct country code for current rnd*/

/*initializes the guessing game round by fetching img and option data, updating the ui*/
export async function guessGame() {
    const roundData = await fetchImg(); /*fetch data from apiFetch.ts fetchImg() function*/

    if (!roundData || !roundData.imageId || !roundData.options.length || !roundData.correctCode) { /*check all param/field for failed fetch*/
        console.error("no round data found");
        return;
    }
    const {imageId, options, correctCode} = roundData; /*extract fields from round obj*/
    currentCorrect = correctCode; /*store correct answer*/

    /*custom event named updateMapImg: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent*/
    /*native browser event api, no need to prop drill. this event specifically lets the browser know when it
    needs to update the button section below the Mapillary viewer each round*/
    const event = new CustomEvent("updateMapImg", {detail: {imageId}});
    window.dispatchEvent(event);

    const buttonSection = document.getElementById("buttons");
    if (!buttonSection) return; /*exit if container crashed*/
    const buttons = buttonSection.querySelectorAll("button");
    /*loop through options and set up each button*/
    options.forEach((code, idx) => {
        if (buttons[idx]) {
            const countryName = getCountryName(code); /*get full country name*/
            buttons[idx].textContent = countryName; /*set button text*/
            buttons[idx].setAttribute("data-code", code); /*store country code for easy access */
            buttons[idx].onclick = () => countryChoice(code); /*assign click handler which calls countryChoice*/
        }
    });
}

/*simple func to increment score*/
function updateScore() {
    const scoreBox = document.getElementById("score"); /*find score in dom*/
    if (scoreBox) { /*if exists, update text with latest values*/
        scoreBox.textContent = `Correct: ${numCorrect} | Incorrect: ${numIncorrect}`;
    }
}

/*very important logic for country buttons*/
export function countryChoice(selectedCode: string) {
    if (!currentCorrect) { /*if no correct answer do nothing as of now*/
        return;
    }

    const answerBox = document.getElementById("answer");
    const isCorrect = selectedCode === currentCorrect;
    if (isCorrect) { /*if user selection is correct increment correct*/
        numCorrect++;
        if (answerBox) { /*need a simple way to give some feedback if the correct or incorrect answer was chosen*/
            answerBox.textContent = `You chose the correct country!`;
            answerBox.style.color = "#2D5016";
        }
    } else {
        numIncorrect++;
        if (answerBox) {
            answerBox.textContent = `Incorrect, the correct country is: ${getCountryName(currentCorrect)}!`;
            answerBox.style.color = "#8B0000";
        }
    }


    updateScore(); /*update display*/
    /*put this here to push guessGame() call at the end of the event queue which makes sure browser UI can catch up*/
    setTimeout(() => {
        if (answerBox) answerBox.textContent = "";
        guessGame();
    }, 500);
}

/*since this is module based gotta make funcs globally acessible for html to work. To do this i attach functs to global window
obj and "as any" so TS knows to allow it (bad practice but for this simplistic usecase hopefully fine)*/
(window as any).countryChoice = countryChoice;
(window as any).guessGame = guessGame;