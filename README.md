# Miami Saga: Flight Run

Miami Saga is a local, real-time browser flight game controlled by an ESP32-S3, an MPU6050, and a GPIO 21 push button. The player flies a rear-view jet low above a procedural Miami-inspired coastal city, avoids aerial obstacles, and fires Skyfire rounds with the physical trigger.

## System architecture

```text
MPU6050 tilt + GPIO 21 trigger
              │ I2C / digital input
              ▼
         ESP32-S3 gamepad firmware
          ├─ neutral tilt calibration
          ├─ smoothed roll/pitch controls
          ├─ debounced fire counter
          └─ WebSocket JSON at 30 Hz
              │ ws://ESP32-IP:81/
              ▼
          Python static-file server
              ▼
       Three.js browser flight game
```

The game runs in the browser. The ESP32 is a wireless motion controller; it does not host the game files.

## Hardware and pin map

| Device | ESP32-S3 pin | Notes |
| --- | --- | --- |
| MPU6050 VCC | 3V3 | Do not power the MPU6050 from 5 V when using 3.3 V I²C logic. |
| MPU6050 GND | GND | Common ground is mandatory. |
| MPU6050 SDA | GPIO 8 | I²C data. |
| MPU6050 SCL | GPIO 9 | I²C clock. |
| MPU6050 AD0 | GND | I²C address `0x68`. |
| Push button, one side | GPIO 21 | Firmware uses `INPUT_PULLUP`. |
| Push button, opposite side | GND | A press reads LOW. |
| Onboard RGB LED | `RGB_BUILTIN` (board-defined, GPIO 48 on this DevKitC-1) | Red blink only during boot neutral calibration; off afterward. |

A four-pin tactile button has two internally connected pin pairs. Put GPIO 21 on one pair and GND on the opposite pair.

## Important custom MPU6050 driver rule

This board is a confirmed MPU6050 with a known defective `WHO_AM_I` response of `0x70`, despite its normal I²C address of `0x68`.

`lib/Adafruit MPU6050/` is a required project-local modified driver. It accepts both `0x68` and `0x70` identity values. Do not replace it with the upstream/current Adafruit MPU6050 library and do not add `adafruit/Adafruit MPU6050` to `lib_deps`.

## ESP32 setup

Create `include/secrets.h`:

```cpp
#pragma once
#define WIFI_SSID "your-network"
#define WIFI_PASSWORD "your-password"
```

Build and upload:

```bash
pio run -e esp32-s3-devkitc-1 -t upload --upload-port /dev/ttyACM0
```

Open the serial monitor at 115200 baud:

```bash
pio device monitor --port /dev/ttyACM0 --baud 115200
```

Keep the controller flat and still while the board starts. It captures its neutral roll/pitch over roughly 0.8 seconds. The serial output then reports the controller WebSocket URL.

## Launch the game

From the repository root:

```bash
python3 -m http.server 8001
```

Open the game:

```text
http://127.0.0.1:8001/browser/
```

Select **Configure Link**, enter the ESP32 IP address printed by the serial monitor, then choose **Save & Connect**. The field intentionally has no prefilled address; its placeholder shows the current known address only as a format example.

- `CALIBRATION` tab: place the MPU6050 flat and still, then restart the ESP32. The onboard RGB LED blinks red during calibration and turns off when ready.
- `FLIGHT SETTINGS` tab: adjust control sensitivity before launching. The setting is hidden during flight.
- During flight, `RESTART FLIGHT` returns to the landing screen without changing the saved controller IP or sensitivity.

## Controls

| Input | Action |
| --- | --- |
| Tilt MPU6050 left/right | Bank and steer the aircraft. |
| Tilt MPU6050 forward/back | Descend/climb. |
| GPIO 21 button press | Fire a Skyfire round. |
| Arrow keys or WASD | Keyboard fallback flight control. |
| Space | Keyboard fallback fire. |

The fire signal is a monotonically increasing event counter, so a press cannot be missed merely because it occurs between WebSocket packets.

## WebSocket protocol

The ESP32 broadcasts one JSON packet about every 33 ms:

```json
{
  "type": "control",
  "roll": -1.0,
  "pitch": 0.42,
  "fire": 8,
  "sequence": 451
}
```

- `roll` and `pitch` are smoothed and constrained to `-1.0…1.0`.
- `fire` increments once for every debounced physical button press.
- `sequence` increments once for each transmitted control frame.

The browser accepts only finite, correctly shaped control packets.

## Project layout

```text
src/main.cpp                    ESP32 motion-controller firmware
lib/Adafruit MPU6050/           Required local modified IMU driver
include/secrets.h               Local Wi-Fi credentials, ignored by Git
browser/index.html              Flight game UI
browser/main.js                 Three.js world, aircraft, combat, transport
browser/game-core.js            Tested packet parsing and control utilities
browser/vendor/three.module.js  Local Three.js 0.181.2 runtime
browser/assets/spark1.png       Local particle sprite asset
browser/test/                   Node tests
```

## Verification

```bash
npm run test:web
pio run -e esp32-s3-devkitc-1
```

`npm run test:web` tests controller-packet parsing and control-envelope clamping. A successful firmware build proves code compatibility, not physical I²C, Wi-Fi, button, or flight-control behavior. Verify those through the serial monitor and browser connection after upload.

## Asset provenance

- `browser/vendor/three.module.js`: Three.js 0.181.2, downloaded from jsDelivr.
- `browser/assets/spark1.png`: Three.js example particle sprite, downloaded from the Three.js project.

Both assets are stored locally so the game renderer does not need a CDN at runtime. Google Fonts remain an optional visual enhancement; browser fallback fonts preserve functionality when offline.

## Troubleshooting

- `MPU6050 initialization failed`: confirm 3.3 V, ground, GPIO 8/9 wiring, and preserve the local custom driver.
- Browser says controller offline: verify the PC and ESP32 use the same LAN; use the IP printed in serial output in the `esp32` URL parameter.
- Plane drifts at rest: reboot with the MPU6050 flat and still during neutral capture.
- Trigger never fires: verify the button spans GPIO 21 and GND on opposite tactile-switch pin pairs.
- No scenery: serve through Python HTTP; browser module imports are not intended to run from `file://` URLs.
