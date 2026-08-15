# 📡 Spike ESP32 Firmware — UART Bridge & AWS IoT Publisher

> Receives framed sensor data from an STM32 over UART, adds real-world timestamps via NTP, and publishes it to AWS IoT Core over MQTT/TLS with X.509 mutual authentication.

<p>
<img alt="platform" src="https://img.shields.io/badge/Board-ESP32%20DevKit-E7352C?style=flat-square&logo=espressif&logoColor=white">
<img alt="protocol" src="https://img.shields.io/badge/Transport-MQTT%20%2F%20TLS-660066?style=flat-square">
<img alt="framework" src="https://img.shields.io/badge/Framework-Arduino-00979D?style=flat-square&logo=arduino&logoColor=white">
</p>

---

## What this board does

The ESP32 is the network bridge in the pipeline — it doesn't sample sensors itself (that's the STM32's job), it just:

1. Reads a fixed-format binary frame from the STM32 over `Serial2` (UART)
2. Validates it (checksum) and unpacks four float sensor values
3. Converts it to JSON, tagged with the device's real UTC timestamp (via NTP — the ESP32 has no RTC)
4. Publishes it over an encrypted, mutually-authenticated MQTT connection straight to **AWS IoT Core** — no intermediate server, no backend in this hop

```
STM32 --[UART, binary frame]--> ESP32 --[MQTT/TLS, X.509]--> AWS IoT Core
```

---

## 🔌 Wiring

| ESP32 pin | STM32 pin | Purpose |
|---|---|---|
| GPIO 16 (RX2) | STM32 TX | receives sensor frames |
| GPIO 17 (TX2) | STM32 RX | (unused in current one-way protocol, wired for future bidirectional use) |
| GND | GND | common ground — required |

`Serial2` is initialized at `115200 8N1`.

---

## 📦 Required libraries (Arduino IDE → Library Manager)

- **PubSubClient** (Nick O'Leary) — MQTT client
- **ArduinoJson** (Benoit Blanchon) — payload construction
- `WiFi.h` / `WiFiClientSecure.h` — bundled with the ESP32 board package, no install needed

---

## ⚙️ Configuration

All `REPLACE_ME` values live at the top of the sketch — nothing connects until they're filled in:

| Setting | Where to get it |
|---|---|
| `WIFI_SSID` / `WIFI_PASSWORD` | your network |
| `AWS_IOT_ENDPOINT` | AWS Console → IoT Core → Settings → Device data endpoint |
| `THING_NAME` | the exact `deviceId` this device should register under in the backend |
| `AWS_IOT_PUBLISH_TOPIC` | must match your AWS IoT Rule's topic filter **exactly** — a mismatch here means messages are published but silently never reach DynamoDB |
| `AWS_CERT_CA` / `AWS_CERT_CRT` / `AWS_CERT_PRIVATE` | PEM contents from AWS IoT Core certificate creation (root CA is public; the device cert + private key are unique per device) |

> **Never commit real certificate/key values to source control.** Keep a `REPLACE_ME`-only version in the repo; keep real certs in a local, gitignored copy or a secrets manager.

---

## 🔗 Topic pattern & fleet scaling

The backend's own MQTT subscriber listens on a wildcard (`iot/datalogger/+/telemetry`) specifically so additional devices need **no backend changes** — just flash a new ESP32 with a different `THING_NAME` and a topic matching the same pattern (e.g. `iot/datalogger/002/telemetry`), and it's picked up automatically, gated only by that device's own certificate/policy.

---

## 🕒 Why NTP matters here

The ESP32 has no real-time clock — `millis()` only counts time since boot, not wall-clock time. Every published reading needs a real Unix timestamp because the backend's DynamoDB queries (date-range filtering, statistics) depend on it. `SyncTime()` blocks briefly at boot (and on WiFi reconnect) until a real time is obtained from NTP, before any publish is attempted.

---

## 📨 Payload shape

```json
{
  "deviceId": "DataLogger001",
  "timestamp": 1785246682,
  "distance_cm": 25.5,
  "temperature_c": 31.2,
  "ldr_percent": 72,
  "pot_percent": 48
}
```

`deviceId` and `timestamp` are required at the top level — the IoT Rule uses them as the DynamoDB partition/sort key. Every other field is passed through as-is and becomes automatically available in the backend's dashboard/statistics — no backend changes needed to add a new sensor field, add it here and it appears.

---

## 🔐 Security notes

- Each physical device should have its **own** certificate — never share one cert across multiple devices in the fleet
- If a certificate is ever exposed (committed to a repo, pasted somewhere public), deactivate and delete it in AWS IoT Core immediately and issue a replacement — a leaked device cert lets anyone publish fake telemetry as that device
- The IoT policy attached to each cert should scope `iot:Publish` to that device's exact topic, not a wildcard, to limit blast radius if one device's cert is compromised

---

<sub>Part of the Spike monorepo — see the [root README](../README.md) for full system architecture.</sub>
