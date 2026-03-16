/**
 * IoT Integration Layer — placeholder APIs for future hardware support.
 *
 * Prepared for:
 *  - Temperature/humidity sensors (DHT22, SHT31, etc.)
 *  - Terrarium cameras (ESP32-CAM, USB webcam streaming)
 *  - UVB light sensors
 *
 * When hardware is available, implement concrete adapters
 * that conform to these interfaces.
 */

export interface SensorReading {
  sensorId: string;
  type: 'temperature' | 'humidity' | 'uvb' | 'light';
  value: number;
  unit: string;
  timestamp: string;
}

export interface CameraFrame {
  cameraId: string;
  imageDataUrl: string;
  timestamp: string;
}

/** Connect to a sensor via its network address or BLE id */
export async function connectSensor(_address: string): Promise<{ connected: boolean }> {
  console.warn('[IoT] connectSensor is a placeholder');
  return { connected: false };
}

/** Poll latest reading from a sensor */
export async function pollSensor(_sensorId: string): Promise<SensorReading | null> {
  console.warn('[IoT] pollSensor is a placeholder');
  return null;
}

/** Get latest camera frame */
export async function getCameraFrame(_cameraId: string): Promise<CameraFrame | null> {
  console.warn('[IoT] getCameraFrame is a placeholder');
  return null;
}

/** Register a webhook / callback for sensor threshold alerts */
export async function registerAlert(
  _sensorId: string,
  _threshold: { min?: number; max?: number },
  _callback: (reading: SensorReading) => void,
): Promise<{ subscriptionId: string }> {
  console.warn('[IoT] registerAlert is a placeholder');
  return { subscriptionId: '' };
}
