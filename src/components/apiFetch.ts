import boundingBoxes from "../assets/curated-bounding-boxes.json"
/*everything needed to set up the hook is found here: https://mapillary.github.io/mapillary-js/*/
/*the bounding box json was found through a google search: https://github.com/sandstrom/country-bounding-boxes/blob/master/bounding-boxes.json*/

/*the purpose of this json is to quickly determine the location of a provided photo, and to also create a set number of possible locations*/
interface assetBBoxJson {
    [key: string]: [string, number[]]; // country code = [name, bbox]
}

interface GameRound { /*this "game" has "rounds" where each round encompasses one 360 pano photograph and four multiple choice questions.*/
    imageId: string; /*unique image key*/
    options: string[]; /*multiple choice country buttons text content*/
    correctCode: string; /*the unique multiple choice solution*/
}

function delay(ms: number) { /*delay func that params a num in ms (time) and sets a timout for that delay*/
    return new Promise(resolve => setTimeout(resolve, ms));
}

const token = import.meta.env.VITE_MAPILLARY_TOKEN as string; /*fetch locally stored token key*/
const countryBBoxes = boundingBoxes as unknown as assetBBoxJson; /*load bbox json*/
const assetJsonCountryCodes = Object.keys(countryBBoxes);/*collect all the codes for each country from assets/bounding-boxes.json*/
/*caching is super important for game smoothness. rather than querying, pulling, downloading and installing a new photo each round-*/
/*-preload 5 on initialization. then simply maintain this by downloading another 5. I could definitely take this further by initializing-*/
/*each round completely in sync but that may hurt total runtime */
let cache: GameRound[] = []; /*this is the cache to be filled with 5 game round objects*/
let cacheIdx = 0; /*current round*/
const CACHE_MAX = 5; /*simple int for max num "pre-loaded" rounds*/
const BBOX_LENGTH = 0.03 /*this is the maximum bbox size determined by the 0.001 square degrees search area limit */

export function getCountryName(countryCode: string): string { /*getter for country name*/
    return countryBBoxes[countryCode]?.[0] || countryCode; /*returns the matching country name inside the countryBBoxes obj or first elem or fallback on the code */
}

function getRandCountry(exclude: string): string[] { /*specialized method of getting a random country for each individual round*/
    const others = assetJsonCountryCodes.filter(c => c !== exclude); /*correct answer cannot be the same as incorrect answers, so filter it from the list by excluding it if found*/
    const picked: string[] = []; /*arr for incorrect options*/
    while (picked.length < 3) { /*simple loop until 3 countries picked*/
        const rand = others[Math.floor(Math.random() * others.length)]; /*select from filtered list by picking a random one and making sure its an int*/
        if (!picked.includes(rand)) picked.push(rand); /*check if duplicate choice isnt already added by comparing arrays, then push a new value on to that open idx*/
    }
    return picked;
}

/*9/29/2025 - Mapillary JUST updated their api with bounding box rules (couldve been because of me idk) making it so bounding box areas
* must be within 0.001 square degrees, so to remedy this I need to limit bounding box sizes to much smaller compliant areas.*/
function getLimitedBBox(minLon: number, minLat: number, maxLon: number, maxLat: number): number[] | null {
    const lonRange = maxLon - minLon - BBOX_LENGTH; /*need to create a range for the geojson to search within */
    const latRange = maxLat - minLat - BBOX_LENGTH; /*taking the max-min-bbox constraint = constraining to minimum search size*/

    const originalArea = (maxLon - minLon) * (maxLat - minLat); /*Boston University spans roughly -71.12 <-> -71.09 long and 42.34 <-> 42.35,
    then take the deltas 0.024 and 0.008 degrees you can find the original area (with a lot of variance): 0.03 *0.01 = 0.0003 */
    if (lonRange <= 0 || latRange <= 0) { /*if the ranges are negative or zero dont bother making changes*/
        if (originalArea > 0.001) { /*if the original area is compliant use it otherwise fail*/
            return [
                +minLon.toFixed(4),
                +minLat.toFixed(4),
                +maxLon.toFixed(4),
                +maxLat.toFixed(4)
            ];
        } else {
            console.warn(`Skipping bbox too large: ${originalArea.toFixed(4)}`);
            return null; // failure
        }
    }

    const randLon = minLon + Math.random() * lonRange; /*get a random coordinate within that lon (definitely wont work in rural areas)*/
    const randLat = minLat + Math.random() * latRange;

    const fixedMinLon = randLon; /*set the new geojson coordinate params for api call*/
    const fixedMinLat = randLat;
    const fixedMaxLon = randLon + BBOX_LENGTH;
    const fixedMaxLat = randLat + BBOX_LENGTH;

    return [ /*an array filled with all api call geojson bbox params (+ just makes sure they are added as nums not strings)*/
        // TODO: num digits param needs fine tuning
        +fixedMinLon.toFixed(4),
        +fixedMinLat.toFixed(4),
        +fixedMaxLon.toFixed(4),
        +fixedMaxLat.toFixed(4)
    ];
}


/*fetch data from mapillary api for new game round, selects random country, finds pano image within its bbox*/
/*promises a game round obj or null if no match found, should probably be an error but it may be quicker to just return null and force it*/
async function fetchFromAPI(): Promise<GameRound | null> {
    const ranCountryCode = assetJsonCountryCodes[Math.floor(Math.random() * assetJsonCountryCodes.length)]; /*select random country as the correct option and image*/
    const [countryName, bbox] = countryBBoxes[ranCountryCode]; /*key value pair for country and its border coordinates*/
    const [countryMinLon, countryMinLat, countryMaxLon, countryMaxLat] = bbox; /*splice into coordinates*/

    const limitedBbox = getLimitedBBox( /*if needed limit the search area to meet new 9/29/2025 api reqs*/
        countryMinLon, countryMinLat, countryMaxLon, countryMaxLat
    );

    if (!limitedBbox) { /*if */
        return null;
    }

    const [minLon, minLat, maxLon, maxLat] = limitedBbox;

    await delay(500); // Wait 500ms between calls

    console.log(`API call for images ${countryName} (${ranCountryCode})`);
    /*this api call and its parts are explained in the documentation linked at the top of the file.*/
    /*call to graph which is the root endpoint for Mapillary metadata using locally stored access token*/
    /*the entity fields include: primary key - id (string), geojson point - geometry, boolean for 360 pano img - is_pano*/
    /*limit is the max num of img to return, bbox filters img to the coordinates provided. */
    /*i chose 1 because even if something corrupted was fetched only 1 img is needed per round, dont want to spam api calls*/
    try {
        const res = await fetch(
            `https://graph.mapillary.com/images?` +
            `access_token=${token}` +
            `&fields=id,geometry,is_pano` +
            `&limit=10` +
            `&bbox=${minLon},${minLat},${maxLon},${maxLat}` +
            `&is_pano=true`
        );

        if (!res.ok) { /*9/29/2025 not sure why everything is down, catch errors if no response*/
            const err = await res.text();
            console.error(`API call failed: ${countryName}. Status: ${res.status}. Error: ${err}`);
            return null;
        }
        const data = await res.json(); /*store fetched data*/
        /*wasnt taught in lecture but very common, ?. is a chaining operator, so if data.data is null it becomes undefined and if it exists it continues as data.data.length and ! negates the total result*/
        if (!data?.data?.length) {/*if api call returns no data or empty array return null for fail*/
            console.warn(`No images found in the small bounding box for ${countryName}. Trying again.`);
            return null;
        }

        const randIdx = Math.floor(Math.random() * data.data.length); /*select a random img from results */
        const imageId = data.data[randIdx].id;

        const otherOptions = getRandCountry(ranCountryCode); /*gen multiple choice options with the correct country and three other random countries*/
        const options = [ranCountryCode, ...otherOptions].sort(() => Math.random() - 0.5); /*shuffle options array for more randomness lol*/
        return {imageId, options, correctCode: ranCountryCode}; /*fully populated game round obj*/
    } catch (e) {
        console.error("Fetch or JSON parsing error:", e);
        return null;
    }
}

async function fillCache() { /*caching function that fills with nw game rounds until max size is reached*/
    let fails = 0;
    const MAX_FAILS = 10;

    while (cache.length < CACHE_MAX && fails < MAX_FAILS) { /*loop fetch until full cache*/
        const round = await fetchFromAPI();
        if (round) {
            cache.push(round); /*only add round to cache if successful call*/
            fails = 0;
        } else {
            fails++;
        }
    }
    if (cache.length < CACHE_MAX) {
        console.error(`Stopped filling cache after ${MAX_FAILS} consecutive failures. Cache size: ${cache.length}`);
    } else {
        console.log(`Cache filled successfully to ${CACHE_MAX} rounds.`);
    }
}

/*main func to get a game round for user manages cache to provide "instant" rounds*/

/*promises game round obj or null if fails to cache*/
export async function fetchImg(): Promise<GameRound | null> {
    if (cacheIdx >= cache.length) { /*if all rounds used in current cache, reset and refill*/
        cache = [];
        cacheIdx = 0;
        console.log("Cache empty - refilling");
        await fillCache();
    }

    if (!cache[cacheIdx]) {
        console.error("cache refill failed to provide a round");
        return null;
    }

    const round = cache[cacheIdx]; /*get next round from cache*/
    cacheIdx++;

    if (round) { /*if on round check cacheIdx, if the user has played at least 3 rnds fill the cache for seamless play*/
        cacheIdx++;
        if (cacheIdx >= cache.length - 2) {
            fillCache()
        }
    } else {
        return null;
    }

    /*?? is super sugary as it returns a round if it is not null and otherwise returns the right side, basically a short if-else with one operator*/
    return round; /*return current round or null if something failed*/
}