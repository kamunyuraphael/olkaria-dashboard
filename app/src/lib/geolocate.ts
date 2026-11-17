/** Asks the browser for the device's position. Rejects with a readable message. */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser can't share your location. Enter coordinates instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: parseFloat(p.coords.latitude.toFixed(4)),
          longitude: parseFloat(p.coords.longitude.toFixed(4)),
        }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location permission was denied. Enter coordinates instead."
              : "Couldn't get your location. Enter coordinates instead."
          )
        ),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}
