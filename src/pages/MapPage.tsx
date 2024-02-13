import { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polyline,
  Marker,
} from "@react-google-maps/api";

const style: React.CSSProperties = {
  width: "90%",
  height: "90vh",
  margin: "0 auto",
};

const position: google.maps.LatLngLiteral = { lat: 47.00367, lng: 28.907089 };

const MapPage = () => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [actionArray, setActionArray] = useState<google.maps.LatLngLiteral[]>(
    []
  );
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const onLoadMap = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      if (e.key === "z" && e.ctrlKey) {
        e.preventDefault();
        undoItem();
      }
      if (e.key === "y" && e.ctrlKey) {
        e.preventDefault();
        redoItem();
      }
    };

    document.addEventListener("keydown", handleUndoRedo);

    return () => {
      document.removeEventListener("keydown", handleUndoRedo);
    };
  }, [path, actionArray]);

  const undoItem = () => {
    if (path.length === 0) return;
    const removedItem = path[path.length - 1];
    setActionArray([...actionArray, removedItem]);
    setPath(path.slice(0, -1));
  };

  const redoItem = () => {
    if (actionArray.length === 0) return;
    const lastRemovedItem = actionArray[actionArray.length - 1];
    setPath([...path, lastRemovedItem]);
    setActionArray(actionArray.slice(0, -1));
  };

  const addPointToPath = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const latLng: google.maps.LatLngLiteral = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      setPath([...path, latLng]);
      setActionArray([]);
    }
  };

  const updateMarkerPosition = (
    index: number,
    newPosition: google.maps.LatLngLiteral
  ) => {
    const newPath = [...path];
    newPath[index] = newPosition;
    setPath(newPath);
  };

  const renderPolyline = () => (
    <Polyline
      path={path}
      options={{
        strokeColor: "#000000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: true,
      }}
    />
  );

  const renderMarkers = () =>
    path.map((item, i) => (
      <Marker
        key={i}
        position={item}
        options={{ draggable: true }}
        onDrag={(e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            updateMarkerPosition(i, {
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            });
          }
        }}
      />
    ));

  return isLoaded ? (
    <div className="map-container">
      <GoogleMap
        onLoad={onLoadMap}
        onClick={addPointToPath}
        mapContainerStyle={style}
        center={position}
        zoom={7}
        options={{ minZoom: 6 }}
      >
        {renderPolyline()}
        {renderMarkers()}
        <div className="buttons">
          <div className="btn" onClick={undoItem}>
            UNDO
          </div>
          {actionArray.length > 0 && (
            <div className="btn" onClick={redoItem}>
              REDO
            </div>
          )}
        </div>
      </GoogleMap>
    </div>
  ) : null;
};

export default MapPage;
