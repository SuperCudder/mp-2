import {useEffect, useRef} from "react";
import {Viewer} from "mapillary-js";
/*This TSX file is based off of this code: https://mapillary.github.io/mapillary-js/docs/intro/try/*/
const token = import.meta.env.VITE_MAPILLARY_TOKEN as string;

interface props {
    imageId: string;
}

const MapView = ({ imageId }: props) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewerRef = useRef<Viewer | null>(null);
    useEffect(() => {
        if (!containerRef.current || !imageId) return;

        if (viewerRef.current) { /* if viewer already init, remove*/
            viewerRef.current.remove();
            viewerRef.current = null;
        }

        viewerRef.current = new Viewer({
            accessToken: token,
            container: containerRef.current,
            imageId: imageId,
        });

        return () => {
            if (viewerRef.current) {
                viewerRef.current.remove();
            }
        };
    }, [imageId]);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "400px",
                border: "1px solid black",
                borderRadius: "5px",
                overflow: "hidden",
            }}
        />
    );
};

export default MapView;
