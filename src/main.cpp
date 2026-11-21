#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Arduino.h>
#include <WebSocketsServer.h>
#include <WiFi.h>
#include <Wire.h>
#include <secrets.h>

constexpr uint8_t I2C_SDA = 8;
constexpr uint8_t I2C_SCL = 9;
constexpr uint8_t MPU_ADDRESS = 0x68;
constexpr uint8_t FIRE_BUTTON_PIN = 21;
constexpr uint16_t WEBSOCKET_PORT = 81;
constexpr uint16_t CONTROL_INTERVAL_MS = 33;  // 30 Hz
constexpr uint16_t BUTTON_DEBOUNCE_MS = 80;
constexpr uint16_t BUTTON_RELEASE_STABLE_MS = 180;
constexpr uint16_t WIFI_CONNECTION_TIMEOUT_MS = 15000;
constexpr float GRAVITY = 9.80665f;
constexpr float TILT_MAX_RADIANS = 0.52f;  // 30 degrees = full control
constexpr float CONTROL_SMOOTHING = 0.18f;

Adafruit_MPU6050 mpu;
WebSocketsServer webSocket(WEBSOCKET_PORT);

float rollReference = 0.0f;
float pitchReference = 0.0f;
float rollControl = 0.0f;
float pitchControl = 0.0f;
uint32_t fireCount = 0;
uint32_t packetSequence = 0;
uint32_t lastControlSentAt = 0;
bool lastRawButtonState = HIGH;
bool stableButtonState = HIGH;
bool fireButtonArmed = true;
uint32_t buttonChangedAt = 0;

float clampFloat(float value, float minimum, float maximum) {
  return value < minimum ? minimum : (value > maximum ? maximum : value);
}

void webSocketEvent(uint8_t client, WStype_t type, uint8_t *, size_t) {
  if (type == WStype_CONNECTED) {
    Serial.printf("WebSocket client %u connected\n", client);
  } else if (type == WStype_DISCONNECTED) {
    Serial.printf("WebSocket client %u disconnected\n", client);
  }
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_CONNECTION_TIMEOUT_MS) {
    delay(200);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("Wi-Fi connected: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("Wi-Fi connection failed; WebSocket will be unavailable");
  }
}

void readTiltAngles(float &roll, float &pitch) {
  sensors_event_t accel, gyro, temperature;
  mpu.getEvent(&accel, &gyro, &temperature);
  const float ax = accel.acceleration.x;
  const float ay = accel.acceleration.y;
  const float az = accel.acceleration.z;
  roll = atan2f(ay, az);
  pitch = atan2f(-ax, sqrtf(ay * ay + az * az));
}

void setStatusLedRed(bool enabled) {
#ifdef RGB_BUILTIN
  neopixelWrite(RGB_BUILTIN, enabled ? 48 : 0, 0, 0);
#endif
}

void turnStatusLedOff() {
#ifdef RGB_BUILTIN
  neopixelWrite(RGB_BUILTIN, 0, 0, 0);
#endif
}

void calibrateNeutralTilt() {
  constexpr uint8_t sampleCount = 80;
  float rollTotal = 0.0f;
  float pitchTotal = 0.0f;
  setStatusLedRed(true);
  for (uint8_t sample = 0; sample < sampleCount; ++sample) {
    if ((sample / 5) % 2 == 0) {
      setStatusLedRed(true);
    } else {
      turnStatusLedOff();
    }
    float roll, pitch;
    readTiltAngles(roll, pitch);
    rollTotal += roll;
    pitchTotal += pitch;
    delay(10);
  }
  turnStatusLedOff();
  rollReference = rollTotal / sampleCount;
  pitchReference = pitchTotal / sampleCount;
  Serial.printf("Neutral tilt captured: roll %.3f, pitch %.3f\n", rollReference, pitchReference);
}

void updateFireButton() {
  const bool rawState = digitalRead(FIRE_BUTTON_PIN);
  const uint32_t now = millis();
  if (rawState != lastRawButtonState) {
    lastRawButtonState = rawState;
    buttonChangedAt = now;
  }

  const uint32_t requiredStableTime = rawState == HIGH
    ? BUTTON_RELEASE_STABLE_MS
    : BUTTON_DEBOUNCE_MS;
  if (rawState == stableButtonState || now - buttonChangedAt < requiredStableTime) {
    return;
  }

  stableButtonState = rawState;
  if (stableButtonState == LOW) {
    if (fireButtonArmed) {
      ++fireCount;
      fireButtonArmed = false;
      Serial.printf("FIRE %lu\n", static_cast<unsigned long>(fireCount));
    }
  } else {
    fireButtonArmed = true;
  }
}

void broadcastControl() {
  char packet[150];
  snprintf(packet, sizeof(packet),
           "{\"type\":\"control\",\"roll\":%.4f,\"pitch\":%.4f,\"fire\":%lu,\"sequence\":%lu}",
           rollControl, pitchControl, static_cast<unsigned long>(fireCount),
           static_cast<unsigned long>(packetSequence++));
  webSocket.broadcastTXT(packet);
}

void setup() {
  Serial.begin(115200);
  delay(400);
  pinMode(FIRE_BUTTON_PIN, INPUT_PULLUP);
  lastRawButtonState = digitalRead(FIRE_BUTTON_PIN);
  stableButtonState = lastRawButtonState;
  fireButtonArmed = stableButtonState == HIGH;
  buttonChangedAt = millis();

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!mpu.begin(MPU_ADDRESS, &Wire)) {
    Serial.println("MPU6050 initialization failed");
    while (true) delay(1000);
  }

  // Uses the project-local modified driver: it accepts this board's known 0x70 WHO_AM_I fault.
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  Serial.println("MPU6050 ready (custom local driver)");
  Serial.println("Keep the controller neutral while calibration runs.");
  calibrateNeutralTilt();

  connectToWiFi();
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.printf("Miami Saga gamepad ready on ws://%s:%u/\n",
                WiFi.localIP().toString().c_str(), WEBSOCKET_PORT);
}

void loop() {
  webSocket.loop();
  updateFireButton();

  float roll, pitch;
  readTiltAngles(roll, pitch);
  const float targetRoll = clampFloat((roll - rollReference) / TILT_MAX_RADIANS, -1.0f, 1.0f);
  const float targetPitch = clampFloat((pitch - pitchReference) / TILT_MAX_RADIANS, -1.0f, 1.0f);
  rollControl += (targetRoll - rollControl) * CONTROL_SMOOTHING;
  pitchControl += (targetPitch - pitchControl) * CONTROL_SMOOTHING;

  if (millis() - lastControlSentAt >= CONTROL_INTERVAL_MS) {
    lastControlSentAt = millis();
    broadcastControl();
  }
}
