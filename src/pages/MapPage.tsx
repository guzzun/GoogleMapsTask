import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

const styleCont: React.CSSProperties = {
  width: "90%",
  height: "90vh",
  margin: "0 auto",
  cursor: "pointer",
};

const position: google.maps.LatLngLiteral = { lat: 47.00367, lng: 28.907089 };

const MapPage = () => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [polylines, setPolylines] = useState<google.maps.Polyline | null>(null);
  const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);
  const [actionArray, setActionArray] = useState<google.maps.LatLngLiteral[]>(
    []
  );

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  // shortcut
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
  }, [path, actionArray, polygon]);

  // drag marker
  useEffect(() => {
    const dragListeners: google.maps.MapsEventListener[] = [];

    markers.forEach((marker) => {
      const listener = marker.addListener("drag", () => moveMarker(marker));
      dragListeners.push(listener);
    });
    return () => {
      dragListeners.forEach((listener) => {
        google.maps.event.removeListener(listener);
      });
    };
  }, [markers, path, polylines, actionArray]);

  // click first marker add polygon
  useEffect(() => {
    if (markers.length > 0) {
      const firstMarker = markers[0];
      const clickListener = firstMarker.addListener("click", () =>
        addPolygon()
      );
      return () => {
        google.maps.event.removeListener(clickListener);
      };
    }
  }, [markers, path]);

  // add polygon
  const addPolygon = () => {
    if (path) {
      deletePolylines();
      const newPolygon = new window.google.maps.Polygon({
        paths: path,
        strokeColor: "#000000",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#000",
        fillOpacity: 0.35,
        editable: true,
        draggable: true,
        map: mapRef.current,
      });
      setPolygon(newPolygon);
    }
  };

  // add marker
  const addMarker = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const latLng: google.maps.LatLngLiteral = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      const newMarker = new window.google.maps.Marker({
        position: latLng,
        map: mapRef.current,
        draggable: true,
      });

      if (markers.length === 0) {
        setMarkers([newMarker]);
        setPath([latLng]);
      } else {
        setMarkers([...markers, newMarker]);
        setPath([...path, latLng]);
        updatePolyline([...path, latLng]);
      }
    }
  };

  // move marker
  const moveMarker = (marker: google.maps.Marker) => {
    const latLng = marker.getPosition()?.toJSON();
    if (latLng) {
      const markerIndex = markers.findIndex((m) => m === marker);
      if (markerIndex !== -1) {
        const newPath = [...path];
        newPath[markerIndex] = latLng;
        setPath(newPath);
        updatePolyline(newPath);
      }
    }
  };

  // add polyline
  const updatePolyline = (newPath: google.maps.LatLngLiteral[]) => {
    if (polylines) {
      polylines.setPath(newPath);
    } else {
      const newPolyline = new window.google.maps.Polyline({
        path: newPath,
        strokeColor: "#000000",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        map: mapRef.current,
      });
      setPolylines(newPolyline);
    }
  };

  // delete polylines
  const deletePolylines = () => {
    if (polylines) {
      polylines.setMap(null);
      setPolylines(null);
    }
  };

  // undo btn
  const undoItem = () => {
    if (path.length === 0) return;
    const removedItem = path[path.length - 1];
    const removedMarker = markers[markers.length - 1];
    removedMarker.setMap(null);

    const newPath = path.slice(0, -1);
    setPath(newPath);
    const newMarkers = markers.slice(0, -1);
    setMarkers(newMarkers);
    updatePolyline(newPath);

    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
    }
    setActionArray([...actionArray, removedItem]);
  };

  // redo btn
  const redoItem = () => {
    if (actionArray.length === 0) return;
    const lastRemovedItem = actionArray[actionArray.length - 1];
    const newMarker = new window.google.maps.Marker({
      position: lastRemovedItem,
      map: mapRef.current,
      draggable: true,
    });
    setPath([...path, lastRemovedItem]);
    setActionArray(actionArray.slice(0, -1));
    setMarkers([...markers, newMarker]);
    updatePolyline([...path, lastRemovedItem]);
  };

  const onLoadMap = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  return isLoaded ? (
    <div className="map-container">
      <GoogleMap
        onLoad={onLoadMap}
        onClick={addMarker}
        mapContainerStyle={styleCont}
        center={position}
        zoom={7}
        options={{ minZoom: 6, draggableCursor: "pointer" }}
      ></GoogleMap>
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
    </div>
  ) : null;
};

export default MapPage;
