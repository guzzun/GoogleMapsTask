import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

interface MapPoint {
  lat: number;
  lng: number;
}

const styleCont: React.CSSProperties = {
  width: "90%",
  height: "90vh",
  margin: "0 auto",
  cursor: "pointer",
};

const position: MapPoint = { lat: 47.00367, lng: 28.907089 };

const MapPage = () => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [path, setPath] = useState<MapPoint[]>([]);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [polylines, setPolylines] = useState<google.maps.Polyline | null>(null);
  const [polygons, setPolygons] = useState<google.maps.Polygon[]>([]);
  const [savedMarkers, setSavedMarkers] = useState<google.maps.Marker[][]>([]);
  const [savedPath, setSavedPath] = useState<MapPoint[][]>([]);
  const [actionArray, setActionArray] = useState<MapPoint[][]>([]);

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

    savedMarkers.forEach((markersArray) => {
      markersArray.forEach((marker) => {
        const listener = marker.addListener("drag", () => moveMarker(marker));
        dragListeners.push(listener);
      });
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
        paths: [path],
        strokeColor: "#000000",
        strokeOpacity: 0.9,
        strokeWeight: 3,
        fillColor: "#000",
        fillOpacity: 0.35,
        draggable: true,
        map: mapRef.current,
      });
      setPolygons([...polygons, newPolygon]);

      const newMarkers = [...markers];
      const newPath = [...path];
      setSavedMarkers([...savedMarkers, newMarkers]);
      setSavedPath([...savedPath, newPath]);

      newMarkers.forEach((marker, index) => {
        marker.setPosition(newPath[index]);
      });

      setPath([]);
      setMarkers([]);
      setPolylines(null);
    }
  };

  const addMarker = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const latLng: MapPoint = {
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
    const findMarkerIndex = (
      markerToFind: google.maps.Marker
    ): [number, number] | null => {
      for (let i = 0; i < savedMarkers.length; i++) {
        const markersArray = savedMarkers[i];
        const indexInArray = markersArray.findIndex((m) => m === markerToFind);
        if (indexInArray !== -1) {
          return [i, indexInArray];
        }
      }
      return null;
    };

    const markerIndex = findMarkerIndex(marker);

    if (markerIndex !== null) {
      const [outerIndex, innerIndex] = markerIndex;

      const latLng = marker.getPosition();

      if (latLng) {
        const newSavedMarkers = [...savedMarkers];
        newSavedMarkers[outerIndex][innerIndex] = marker;
        setSavedMarkers(newSavedMarkers);

        if (polylines) {
          const newPath = [...path];
          newPath[innerIndex] = latLng.toJSON();
          setPath(newPath);
          updatePolyline(newPath);
        }

        const updatedPolygons = polygons.map((polygon, index) => {
          if (index === outerIndex) {
            const polygonPath = polygon.getPath();
            const polygonPathArray = polygonPath.getArray();
            polygonPathArray[innerIndex] = latLng;
            polygon.setPath(polygonPathArray);
          }
          return polygon;
        });

        setPolygons(updatedPolygons);
      }
    }
  };

  const editPolygons = () => {
    polygons.forEach((polygon: google.maps.Polygon, outerIndex: number) => {
      const path = polygon.getPath();
      google.maps.event.addListener(path, "set_at", (index: number) => {
        const newPosition = path.getAt(index);
        const marker = savedMarkers[outerIndex][index];
        marker.setPosition(newPosition);
      });
    });
  };

  const updatePolyline = (newPath: MapPoint[]) => {
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

  const undoItem = () => {
    if (polygons.length > 0) {
      undoPolygon();
    } else {
      undoPolyline();
    }
  };

  const undoPolygon = () => {
    if (polygons.length === 0) return;

    const lastPolygon = polygons[polygons.length - 1];
    const lastPolygonIndex = polygons.length - 1;
    const lastPolygonPath = lastPolygon.getPath().getArray();

    const lastPolygonPathMapPoints: MapPoint[] = lastPolygonPath.map(
      (latLng: google.maps.LatLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      })
    );

    const newPolygonPath = lastPolygonPathMapPoints.slice(0, -1);
    lastPolygon.setPath(newPolygonPath);

    const lastSavedMarkers = savedMarkers[lastPolygonIndex];
    if (lastSavedMarkers && lastSavedMarkers.length > 0) {
      const newMarkers = [...lastSavedMarkers];
      const removedMarker = newMarkers.pop();

      if (removedMarker) {
        removedMarker.setMap(null);
      }

      const newSavedMarkers = [...savedMarkers];
      newSavedMarkers[lastPolygonIndex] = newMarkers;
      setSavedMarkers(newSavedMarkers);
    }

    if (newPolygonPath.length === 0) {
      lastPolygon.setMap(null);
      const newPolygons = polygons.slice(0, -1);
      setPolygons(newPolygons);
    }

    const newPath = savedPath[lastPolygonIndex].slice(0, -1);
    const newSavedPath = [...savedPath];
    newSavedPath[lastPolygonIndex] = newPath;
    setSavedPath(newSavedPath);

    setActionArray([...actionArray, lastPolygonPathMapPoints]);
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
    setActionArray([...actionArray, [removedItem]]);
  };

  const redoItem = () => {
    if (actionArray.length === 0) return;

    const lastAction = actionArray[actionArray.length - 1];

    const isPolyline =
      lastAction.length === 1 &&
      "lat" in lastAction[0] &&
      "lng" in lastAction[0];

    if (isPolyline) {
      redoPolyline(lastAction[0]);
    } else {
      redoPolygon(lastAction);
    }

    setActionArray((prevActions) => prevActions.slice(0, -1));
  };

  const redoPolyline = (lastPoint: MapPoint) => {
    const newPointLatLng = new window.google.maps.LatLng(
      lastPoint.lat,
      lastPoint.lng
    );

    const newPath = [...path, lastPoint];
    setPath(newPath);
    updatePolyline(newPath);

    const newMarker = new window.google.maps.Marker({
      position: newPointLatLng,
      map: mapRef.current,
      draggable: true,
    });

    setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
  };

  const redoPolygon = (lastPolygonPoints: MapPoint[]) => {
    deletePolylines();
    const newPolygon = new window.google.maps.Polygon({
      paths: lastPolygonPoints,
      strokeColor: "#000000",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      fillColor: "#000",
      fillOpacity: 0.35,
      draggable: true,
      map: mapRef.current,
    });

    const newMarkers = lastPolygonPoints.map((point: MapPoint) => {
      const marker = new window.google.maps.Marker({
        position: point,
        map: mapRef.current,
        draggable: true,
      });
      return marker;
    });

    setPolygons((prevPolygons) => [...prevPolygons, newPolygon]);
    setSavedMarkers((prevSavedMarkers) => [...prevSavedMarkers, newMarkers]);
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
