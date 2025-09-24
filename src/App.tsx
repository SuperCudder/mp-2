import MapView from "./MapView.tsx";

function App() {
    const testImageId = "498763468214164";
    return (
        <div>
            <h1>Country Guesser</h1>
            <MapView imageId={testImageId} />
        </div>
    );
}

export default App;