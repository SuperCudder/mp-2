import {useEffect, useRef} from "react";
import {Viewer} from "mapillary-js";
import styled from "styled-components";

/*This TSX file is based off of this code: https://mapillary.github.io/mapillary-js/docs/intro/try/*/
/*This documentation was also highly valuable for completing this project: https://mapillary.github.io/mapillary-js/api/*/
const token = import.meta.env.VITE_MAPILLARY_TOKEN as string; /*import token from local environment to keep key off version control*/

interface props { /*component prop interface*/
    imageId: string;
}

const ViewerCont = styled.div`
    margin: 0 auto;
    max-width: 90%;
    width: 150vh;
    height: 35vw;
    border: 1px solid black;
    border-radius: 5px;
    overflow: hidden;
`

const MapView = ({imageId}: props) => { /*render viewer window using api call*/
    /*ref for dom container for mounting mapillary view*/
    const containerRef = useRef<HTMLDivElement | null>(null); /*DOM element reference for mapillary, useRef instead of useState since it doesnt provide DOM nodes*/
    /*holds mapillary viewer instance*/
    const viewerRef = useRef<Viewer | null>(null);
    useEffect(() => {
        /*check if container isnt ready or img is missing*/
        if (!containerRef.current || !imageId) return;
        /*refs are way better than states for overhead, states rerender, ref is persistent and for mapillary object is much cheaper*/
        if (viewerRef.current) { /* if viewer already init, remove*/
            viewerRef.current.remove();
            viewerRef.current = null;
        }

        viewerRef.current = new Viewer({ /*init new viewer*/
            accessToken: token,
            container: containerRef.current,
            imageId: imageId,
        });

        return () => { /*clean up at unmount or before rerun */
            if (viewerRef.current) {
                viewerRef.current.remove();
            }
        };
    }, [imageId]); /*dependancy arr for component mounts*/

    return <ViewerCont ref={containerRef}/>;
};


export default MapView;
