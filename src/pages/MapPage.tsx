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
  const [polygons, setPolygons] = useState<google.maps.Polygon[]>([]);
  const [savedMarkers, setSavedMarkers] = useState<google.maps.Marker[]>([]);
  const [savedPath, setSavedPath] = useState<google.maps.LatLngLiteral[][]>([]);

  const [actionArray, setActionArray] = useState<any>([]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

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
  }, [path, actionArray, polygons]);

  useEffect(() => {
    editPolygons();
  }, [polygons]);

  useEffect(() => {
    const dragListeners: google.maps.MapsEventListener[] = [];

    savedMarkers.forEach((marker) => {
      const listener = marker.addListener("drag", () => moveMarker(marker));
      dragListeners.push(listener);
    });

    return () => {
      dragListeners.forEach((listener) => {
        google.maps.event.removeListener(listener);
      });
    };
  }, [savedMarkers]);

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

  const addPolygon = () => {
    if (path.length > 2) {
      deletePolylines();
      const newPolygon = new window.google.maps.Polygon({
        paths: path,
        strokeColor: "#000000",
        strokeOpacity: 0.9,
        strokeWeight: 3,
        fillColor: "#000",
        fillOpacity: 0.35,
        editable: true,
        draggable: true,
        map: mapRef.current,
      });
      setPolygons([...polygons, newPolygon]);

      const allMarkers = [...savedMarkers, ...markers];
      const allPath = [...savedPath, path];
      setSavedMarkers(allMarkers);
      setSavedPath(allPath);
      setPath([]);
      setMarkers([]);
      setPolylines(null);
    }
  };

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

  const moveMarker = (marker: google.maps.Marker) => {
    const latLng = marker.getPosition()?.toJSON();

    if (latLng) {
      const markerIndex = savedMarkers.findIndex((m) => m === marker);
      if (markerIndex !== -1) {
        const newSavedMarkers = [...savedMarkers];
        newSavedMarkers[markerIndex] = marker;
        setSavedMarkers(newSavedMarkers);

        if (polylines) {
          const newPath = [...path];
          newPath[markerIndex] = latLng;
          setPath(newPath);
          updatePolyline(newPath);
        }

        const updatedPolygons = polygons.map((polygon) => {
          const polygonPath = polygon.getPath();
          const polygonPathArray = polygonPath.getArray();
          polygonPathArray[markerIndex] = new google.maps.LatLng(latLng);
          const newPolygonPath = new google.maps.MVCArray(polygonPathArray);
          polygon.setPath(newPolygonPath);
          return polygon;
        });
        console.log(savedPath);

        setPolygons(updatedPolygons);
      }
    }
  };

  const editPolygons = () => {
    polygons.forEach((polygon: google.maps.Polygon) => {
      google.maps.event.addListener(polygon.getPath(), "insert_at", () => {
        console.log("adauga marker");
        addMidPoint(polygon);
      });
    });
  };

  const addMidPoint = (polygon: google.maps.Polygon) => {};

  const updatePolyline = (newPath: google.maps.LatLngLiteral[]) => {
    if (polylines) {
      polylines.setPath(newPath);
    } else {
      const newPolyline = new window.google.maps.Polyline({
        path: newPath,
        strokeColor: "#000000",
        strokeOpacity: 0.9,
        strokeWeight: 3,
        map: mapRef.current,
      });
      setPolylines(newPolyline);
    }
  };

  const deletePolylines = () => {
    if (polylines) {
      polylines.setMap(null);
      setPolylines(null);
    }
  };

  const undoPolyline = () => {
    if (path.length === 0) return;
    const removedItem = path[path.length - 1];
    const removedMarker = markers[markers.length - 1];
    removedMarker.setMap(null);

    const newPath = path.slice(0, -1);
    setPath(newPath);
    const newMarkers = markers.slice(0, -1);
    setMarkers(newMarkers);
    updatePolyline(newPath);
    setActionArray([...actionArray, removedItem]);
  };

  const undoItem = () => {
    if (polygons.length > 0) {
      const lastPolygon = polygons[polygons.length - 1];
      const lastPolygonPath = lastPolygon.getPath().getArray();

      const newPolygonPath = lastPolygonPath.slice(0, -1);
      lastPolygon.setPath(newPolygonPath);
      const removedMarker = savedMarkers[savedMarkers.length - 1];
      removedMarker.setMap(null);

      if (newPolygonPath.length === 0) {
        lastPolygon.setMap(null);
        const newPolygons = polygons.slice(0, -1);
        setPolygons(newPolygons);
      }

      const newMarkers = savedMarkers.slice(0, -1);
      setSavedMarkers(newMarkers);
      const newPath = savedPath.slice(0, -1);
      setSavedPath(newPath);

      setActionArray([...actionArray, lastPolygonPath.slice()]);
    } else {
      undoPolyline();
    }
  };

  const redoItem = () => {
    if (actionArray.length === 0) return;

    const lastRemovedItem = actionArray[actionArray.length - 1];

    lastRemovedItem.forEach((point: google.maps.LatLngLiteral) => {
      const marker = new window.google.maps.Marker({
        position: point,
        map: mapRef.current,
        draggable: true,
      });
      setSavedMarkers((prevMarkers) => [...prevMarkers, marker]);
    });

    const newPolygon = new window.google.maps.Polygon({
      paths: lastRemovedItem,
      strokeColor: "#000000",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      fillColor: "#000",
      fillOpacity: 0.35,
      editable: true,
      draggable: true,
      map: mapRef.current,
    });

    setPolygons((prevPolygons) => [...prevPolygons, newPolygon]);

    setSavedPath((prevPath) => [...prevPath, ...lastRemovedItem]);
    setActionArray(actionArray.slice(0, -1));
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
