import boundingBoxes from "./assets/bounding-boxes.json"
/*everything needed to set up the hook is found here: https://mapillary.github.io/mapillary-js/*/
/*the bounding box json was found through a google search: https://github.com/sandstrom/country-bounding-boxes/blob/master/bounding-boxes.json*/

/*the purpose of this json is to quickly determine the location of a provided photo, and to also create a set number of possible locations*/
interface CountryBBox {
    [key: string]: [string, number[]]; // country code = [name, bbox]
}

interface GameRound { /*this "game" has "rounds" where each round encompasses one 360 pano photograph and four multiple choice questions.*/
    imageId: string;
    options: string[];
    correctCode: string;
}

const token = import.meta.env.VITE_MAPILLARY_TOKEN as string; /*fetch locally stored token*/
const countryBBoxes = boundingBoxes as unknown as CountryBBox; /*load bbox json*/
const countryCodes = Object.keys(countryBBoxes);/*collect all the codes for each country*/
/*caching is super important for game smoothness. rather than querying, pulling, downloading and installing a new photo each round-*/
/*-preload 5 on initialization. then simply maintain this by downloading another 5. I could definitely take this further by initializing-*/
/*each round completely in sync but that may hurt total runtime */
let cache: GameRound[] = [];
let cacheIdx = 0;
const CACHE_MAX = 5; /*simple int for max num "pre-loaded" rounds*/

export function getCountryName(countryCode: string): string { /*getter for country name*/
    return countryBBoxes[countryCode]?.[0] || countryCode;
}

export function getAllCountryData(): CountryBBox { /*getter for all other necessary data*/
    return countryBBoxes;
}

function getRandCountry(exclude: string): string[] { /*specialized method of getting a random country for each individual round*/
    const others = countryCodes.filter(c => c !== exclude); /*correct answer cannot be the same as incorrect answers, so filter it from the list*/
    const picked: string[] = []; /*arr for incorrect options*/
    while (picked.length < 3) { /*simple loop until 3 countries picked*/
        const rand = others[Math.floor(Math.random() * others.length)]; /*select from filtered list*/
        if (!picked.includes(rand)) picked.push(rand); /*check if choice isnt already added*/
    }
    return picked;
}

/*fetch data from mapillary api for new game round, selects random country, finds pano image within its bbox*/

/*promises a game round obj or null if no match found, should probably be an error but it may be quicker to just return null and force it*/
async function fetchFromAPI(): Promise<GameRound | null> {
    const ranCountryCode = countryCodes[Math.floor(Math.random() * countryCodes.length)]; /*select random country as the correct option and image*/
    const [countryName, bbox] = countryBBoxes[ranCountryCode]; /*key value pair for country and its border coordinates*/
    const [minLon, minLat, maxLon, maxLat] = bbox; /*splice into coordinates*/

    console.log(`API call for images ${countryName} (${ranCountryCode})`);
    /*this api call and its parts are explained in the documentation linked at the top of the file.*/
    /*call to graph which is the root endpoint for Mapillary metadata using locally stored access token*/
    /*the entity fields include: primary key - id (string), geojson point - geometry, boolean for 360 pano img - is_pano*/
    /*limit is the max num of img to return, bbox filters img to the coordinates provided. */
    /*i chose 10 because if something corrupted was fetched there are 2x the currently set cache max so fallback on*/
    const res = await fetch(
        `https://graph.mapillary.com/images?` +
        `access_token=${token}` +
        `&fields=id,geometry,is_pano` +
        `&limit=10` +
        `&bbox=${minLon},${minLat},${maxLon},${maxLat}` +
        `&is_pano=true`
    );
    const data = await res.json(); /*store fetched data*/
    if (!data?.data?.length) return null; /*if api call returns no data or empty array return null for fail*/

    const randIdx = Math.floor(Math.random() * data.data.length); /*select a random img from results */
    const imageId = data.data[randIdx].id;

    const otherOptions = getRandCountry(ranCountryCode); /*gen multiple choice options with the correct country and three other random countries*/
    const options = [ranCountryCode, ...otherOptions].sort(() => Math.random() - 0.5); /*shuffle options array for more randomness lol*/
    return {imageId, options, correctCode: ranCountryCode}; /*fully populated game round obj*/
}

async function fillCache() { /*caching function that fills with nw game rounds until max size is reached*/
    while (cache.length < CACHE_MAX) { /*loop fetch until full cache*/
        const round = await fetchFromAPI();
        if (round) cache.push(round); /*only add rund to cache if successful call*/
    }
}

/*main func to get a game round for user manages cache to provide "instant" rounds*/

/*promises game round obj or null if fails to cache*/
export async function fetchImg(): Promise<GameRound | null> {
    if (cacheIdx >= cache.length) { /*if all rounds used in current cache, reset and refill*/
        cache = [];
        cacheIdx = 0;
        await fillCache();
    }

    const round = cache[cacheIdx]; /*get next round from cache*/
    cacheIdx++;

    if (cacheIdx >= cache.length - 2) { /*star refilling cache in background when low (could be expensive ngl) could try math.low(cachemax / 2)*/
        await fillCache()
    }

    return round ?? null; /*return current round or null if something failed*/

}