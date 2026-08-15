/* ============================================================
 * ESP32 -- STM32 Data Link + AWS IoT Core MQTT Publisher
 * Board: ESP32 DevKit V1, Arduino core
 *
 * Pipeline:
 *   STM32 (binary frame, UART2) -> parse -> JSON -> MQTT/TLS -> AWS IoT Core
 *
 * Libraries required (install via Library Manager):
 *   - PubSubClient   (Nick O'Leary)
 *   - ArduinoJson    (Benoit Blanchon)
 *
 * ALL VALUES MARKED "REPLACE_ME" ARE PLACEHOLDERS.
 * Nothing will connect to AWS until these are filled in with
 * your real values from the AWS IoT Core console.
 * ============================================================ */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <string.h>
#include <time.h>

/* ------------------------------------------------------------
 * WiFi credentials -- REPLACE_ME
 * ------------------------------------------------------------ */
#define WIFI_SSID       "AnirudhPatil"
#define WIFI_PASSWORD   "123456789"

/* ------------------------------------------------------------
 * AWS IoT Core connection details -- REPLACE_ME
 * Endpoint: AWS Console -> IoT Core -> Settings -> Device data endpoint
 * Thing name: must match the Thing you registered (used as MQTT client ID)
 * Topic: must match the resource ARN in your attached IoT Policy
 * ------------------------------------------------------------ */
#define AWS_IOT_ENDPOINT        "a7jnv5nj8o8hb-ats.iot.ap-south-1.amazonaws.com"
#define AWS_IOT_PORT             8883
#define THING_NAME               "DataLogger001"
#define AWS_IOT_PUBLISH_TOPIC    "iot/datalogger/001/telemetry"   /* REPLACE_ME if your policy uses a different topic */

/* ------------------------------------------------------------
 * AWS IoT certificates -- REPLACE_ME
 * Paste exact PEM content (including ----BEGIN/END---- lines)
 * from the 3 files AWS generated when you created the certificate:
 *   AmazonRootCA1.pem      -> AWS_CERT_CA
 *   <thing>-certificate.pem.crt -> AWS_CERT_CRT
 *   <thing>-private.pem.key     -> AWS_CERT_PRIVATE
 * ------------------------------------------------------------ */
static const char AWS_CERT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----

-----END CERTIFICATE-----
)EOF";

static const char AWS_CERT_CRT[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----

-----END CERTIFICATE-----

)EOF";

static const char AWS_CERT_PRIVATE[] PROGMEM = R"EOF(
-----BEGIN RSA PRIVATE KEY-----

-----END RSA PRIVATE KEY-----
)EOF";

/* ------------------------------------------------------------
 * UART frame protocol (unchanged from verification stage)
 * ------------------------------------------------------------ */
#define FRAME_START     0xAA
#define FRAME_END       0x55
#define PAYLOAD_SIZE    16

typedef enum
{
    STATE_WAIT_START,
    STATE_READ_LEN,
    STATE_READ_PAYLOAD,
    STATE_READ_CHECKSUM,
    STATE_READ_END
} ParserState_t;

typedef struct
{
    float distanceCm;
    float temperatureC;
    float ldrPercent;
    float potPercent;
} SensorFrame_t;

struct tm timeinfo;

static ParserState_t sState        = STATE_WAIT_START;
static uint8_t       sPayload[PAYLOAD_SIZE];
static uint8_t       sPayloadIndex = 0;
static uint8_t       sFrameLen     = 0;
static uint8_t       sRxChecksum   = 0;

/* ------------------------------------------------------------
 * WiFi / MQTT client objects
 * ------------------------------------------------------------ */
WiFiClientSecure sNetClient;
PubSubClient     sMqttClient(sNetClient);

static uint8_t CalculateChecksum(const uint8_t *data, uint16_t len)
{
    uint32_t sum = 0;
    for (uint16_t i = 0; i < len; i++)
    {
        sum += data[i];
    }
    return (uint8_t)(sum & 0xFF);
}

/* ------------------------------------------------------------
 * WiFi connection with blocking retry (acceptable at startup)
 * ------------------------------------------------------------ */
static void ConnectWiFi(void)
{
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());
}

/* ------------------------------------------------------------
 * AWS IoT MQTT/TLS connection with retry
 * ------------------------------------------------------------ */
static void ConnectAWS(void)
{
    sNetClient.setCACert(AWS_CERT_CA);
    sNetClient.setCertificate(AWS_CERT_CRT);
    sNetClient.setPrivateKey(AWS_CERT_PRIVATE);

    sMqttClient.setServer(AWS_IOT_ENDPOINT, AWS_IOT_PORT);

    Serial.println("Connecting to AWS IoT Core...");

    uint8_t retryCount = 0;
    while (!sMqttClient.connect(THING_NAME) && retryCount < 10)
    {
        Serial.print("AWS IoT connect failed, rc=");
        Serial.print(sMqttClient.state());
        Serial.println(" -- retrying in 2s");
        delay(2000);
        retryCount++;
    }

    if (sMqttClient.connected())
    {
        Serial.println("Connected to AWS IoT Core.");
    }
    else
    {
        Serial.println("AWS IoT connection failed after retries -- will retry in main loop.");
    }
}

/* ------------------------------------------------------------
 * Convert parsed sensor frame to JSON and publish
 * ------------------------------------------------------------ */
static void PublishSensorData(const SensorFrame_t *pData)
{
    if (!sMqttClient.connected())
    {
        Serial.println("[WARN] MQTT not connected -- skipping publish");
        return;
    }

    StaticJsonDocument<128> doc;
    doc["deviceId"] = THING_NAME;
    doc["timestamp"] = time(nullptr);

    doc["distance_cm"]    = pData->distanceCm;
    doc["temperature_c"]  = pData->temperatureC;
    doc["ldr_percent"]    = pData->ldrPercent;
    doc["pot_percent"]    = pData->potPercent;

    char jsonBuffer[128];
    size_t jsonLen = serializeJson(doc, jsonBuffer);

    bool published = sMqttClient.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer, jsonLen);

    Serial.print("Publish ");
    Serial.print(published ? "OK: " : "FAILED: ");
    Serial.println(jsonBuffer);
}

/* ------------------------------------------------------------
 * UART frame parser (identical logic to verification stage,
 * only the "frame complete" action changed: publish instead
 * of print-only)
 * ------------------------------------------------------------ */
static void ProcessByte(uint8_t b)
{
    switch (sState)
    {
        case STATE_WAIT_START:
            if (b == FRAME_START)
            {
                sState = STATE_READ_LEN;
            }
            break;

        case STATE_READ_LEN:
            sFrameLen = b;
            if (sFrameLen != PAYLOAD_SIZE)
            {
                sState = STATE_WAIT_START;
            }
            else
            {
                sPayloadIndex = 0;
                sState = STATE_READ_PAYLOAD;
            }
            break;

        case STATE_READ_PAYLOAD:
            sPayload[sPayloadIndex++] = b;
            if (sPayloadIndex >= PAYLOAD_SIZE)
            {
                sState = STATE_READ_CHECKSUM;
            }
            break;

        case STATE_READ_CHECKSUM:
            sRxChecksum = b;
            sState = STATE_READ_END;
            break;

        case STATE_READ_END:
            if (b == FRAME_END)
            {
                uint8_t checkBuf[1 + PAYLOAD_SIZE];
                checkBuf[0] = sFrameLen;
                memcpy(&checkBuf[1], sPayload, PAYLOAD_SIZE);
                uint8_t calculatedChecksum = CalculateChecksum(checkBuf, sizeof(checkBuf));

                if (calculatedChecksum == sRxChecksum)
                {
                    SensorFrame_t data;
                    memcpy(&data.distanceCm,   &sPayload[0],  sizeof(float));
                    memcpy(&data.temperatureC, &sPayload[4],  sizeof(float));
                    memcpy(&data.ldrPercent,   &sPayload[8],  sizeof(float));
                    memcpy(&data.potPercent,   &sPayload[12], sizeof(float));

                    Serial.print("Distance: ");
                    Serial.print(data.distanceCm, 1);
                    Serial.print(" cm | Temp: ");
                    Serial.print(data.temperatureC, 1);
                    Serial.print(" C | LDR: ");
                    Serial.print(data.ldrPercent, 0);
                    Serial.print(" % | Pot: ");
                    Serial.print(data.potPercent, 0);
                    Serial.println(" %");

                    PublishSensorData(&data);
                }
                else
                {
                    Serial.println("[WARN] Checksum mismatch -- frame discarded");
                }
            }
            else
            {
                Serial.println("[WARN] End byte mismatch -- frame discarded, resyncing");
            }
            sState = STATE_WAIT_START;
            break;
    }
}

// The Time Function Used for getting actual time using NTP protocol
static void SyncTime(void)
{
    Serial.println("Synchronizing time...");

    configTime(
        19800,      // GMT+5:30
        0,
        "pool.ntp.org",
        "time.nist.gov"
    );

    time_t now;

    while ((now = time(nullptr)) < 100000)
    {
        Serial.print(".");
        delay(500);
    }

    Serial.println();
    Serial.println("Time synchronized.");

    Serial.print("Unix Time: ");
    Serial.println(now);

    if (getLocalTime(&timeinfo))
    {
        Serial.print("Current Time : ");
        Serial.println(&timeinfo, "%d-%m-%Y %H:%M:%S");
    }
}

void setup()
{
    Serial.begin(115200);
    Serial2.begin(115200, SERIAL_8N1, 16, 17);   /* link to STM32 */

    ConnectWiFi();
    SyncTime();
    ConnectAWS();

    Serial.println("ESP32 Data Logger -- waiting for frames...");
}

void loop()
{
    // /* Keep WiFi and MQTT connections alive; reconnect if dropped. */
    // if (WiFi.status() != WL_CONNECTED)
    // {
    //     ConnectWiFi();
    // }

    // if (!sMqttClient.connected())
    // {
    //     ConnectAWS();
    // }

    // sMqttClient.loop();   /* required by PubSubClient to process incoming/keepalive */

    // while (Serial2.available())
    // {
    //     uint8_t b = (uint8_t)Serial2.read();
    //     ProcessByte(b);
    // }

    if (WiFi.status() != WL_CONNECTED)
    {
        ConnectWiFi();
        SyncTime();
    }

    if (!sMqttClient.connected())
    {
        ConnectAWS();
    }

    sMqttClient.loop();

    static unsigned long lastPublish = 0;

    if (millis() - lastPublish >= 5000)
    {
        lastPublish = millis();

        StaticJsonDocument<200> doc;

        doc["deviceId"] = THING_NAME;
        doc["timestamp"] = time(nullptr);
        doc["distance_cm"] = 25.5;
        doc["temperature_c"] = 31.2;
        doc["ldr_percent"] = 72;
        doc["pot_percent"] = 48;

        char jsonBuffer[200];
        serializeJson(doc, jsonBuffer);

        bool status = sMqttClient.publish(
            AWS_IOT_PUBLISH_TOPIC,
            jsonBuffer
        );

        Serial.print("Publish Status: ");
        Serial.println(status ? "SUCCESS" : "FAILED");

        Serial.println(jsonBuffer);
    }
}
