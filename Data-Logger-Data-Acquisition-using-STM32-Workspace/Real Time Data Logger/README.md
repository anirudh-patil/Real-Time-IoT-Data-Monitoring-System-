# 🔧 Spike STM32 Firmware — Sensor Sampling & Frame Protocol

> Samples onboard sensors and hands them off to the ESP32 over UART using a fixed-format, checksum-verified binary frame.

<p>
<img alt="platform" src="https://img.shields.io/badge/MCU-STM32-03234B?style=flat-square">
<img alt="protocol" src="https://img.shields.io/badge/Transport-UART%20%2F%20Framed%20Binary-6f42c1?style=flat-square">
</p>

> **Note on this document:** this README specifies the **wire protocol contract** the STM32 firmware must satisfy to interoperate with the ESP32 bridge — derived from the ESP32-side parser this platform is built against. It documents the interface, not a specific STM32 implementation. Replace this note once the actual STM32 source lives in this workspace, and correct anything below that doesn't match the real firmware.

---

## Role in the pipeline

```
[Sensors] --analog/digital--> STM32 --UART, framed binary--> ESP32
```

The STM32 owns sensor sampling. It has no network stack, no AWS awareness, and no knowledge of MQTT — its only job is producing a correctly-framed, checksummed packet on its UART TX line, once per sample cycle.

---

## Frame format

| Byte(s) | Field | Value |
|---|---|---|
| 1 | Start byte | `0xAA` |
| 1 | Length | `0x10` (16 — payload size in bytes) |
| 16 | Payload | 4 × 32-bit float, little-endian (see below) |
| 1 | Checksum | sum of `[length byte + payload bytes]`, truncated to 1 byte (`& 0xFF`) |
| 1 | End byte | `0x55` |

**Total frame size: 20 bytes.**

### Payload layout (16 bytes = 4 floats)

| Offset | Field | Type |
|---|---|---|
| 0–3 | Distance (cm) | `float32` |
| 4–7 | Temperature (°C) | `float32` |
| 8–11 | LDR / light level (%) | `float32` |
| 12–15 | Potentiometer (%) | `float32` |

This ordering must match exactly — the ESP32 parser reads these four floats positionally, not by any embedded field name.

### Checksum

```
checksum = (length_byte + sum(payload_bytes)) & 0xFF
```
The receiving side (ESP32) recomputes this and silently discards the frame on mismatch — a malformed or corrupted frame is dropped, not partially processed.

---

## UART settings

`115200 baud, 8N1` (8 data bits, no parity, 1 stop bit) — must match the ESP32's `Serial2.begin(115200, SERIAL_8N1, 16, 17)` exactly, or every frame will fail to parse.

---

## Suggested transmit loop (pseudocode)

```
loop:
    reading = sample_all_sensors()
    payload[16] = pack_floats_LE(reading.distance, reading.temperature, reading.ldr, reading.pot)
    checksum = (0x10 + sum(payload)) & 0xFF

    uart_send(0xAA)         // start
    uart_send(0x10)         // length
    uart_send(payload, 16)  // payload
    uart_send(checksum)     // checksum
    uart_send(0x55)         // end

    delay(SAMPLE_INTERVAL_MS)
```

---

## Extending the protocol

Adding a new sensor value means:
1. Increasing `PAYLOAD_SIZE` on **both** sides
2. Adding the new float to the payload pack/unpack on **both** sides
3. Updating the ESP32's JSON construction to include the new field under its real name (e.g. `voltage`, `current`) — everything downstream (backend, dashboard) picks up new fields automatically with zero further changes, since telemetry handling is schema-agnostic end-to-end

There is currently no versioning byte in the frame — a length mismatch is the only safety net if firmware versions on either side drift out of sync. Consider adding a protocol-version byte before scaling to multiple hardware revisions in the field.

---

<sub>Part of the Spike monorepo — see the [root README](../README.md) for full system architecture.</sub>
