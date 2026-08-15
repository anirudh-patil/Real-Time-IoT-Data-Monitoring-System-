/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "cmsis_os.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include <stdio.h>
#include <string.h>
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* HC-SR04 Input Capture state machine */
typedef enum
{
    HCSR04_STATE_WAIT_RISING = 0,
    HCSR04_STATE_WAIT_FALLING
} HCSR04_State_t;

typedef struct
{
    float fDistanceCm;
    float fTemperatureC;
    float fLdrPercent;
    float fPotPercent;
} SensorData_t;

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */
#define DWT_CTRL        (*(volatile uint32_t*)0xE0001000)
#define DWT_CYCCNT       (*(volatile uint32_t*)0xE0001004)
#define DEMCR            (*(volatile uint32_t*)0xE000EDFC)
#define RS 8
#define EN 9
#define ADC_CHANNEL_COUNT   3U
#define ADC_VREF_MV         3300.0f   // board supply Nucleo-F446RE VDDA tied to 3.3V rail.*/
#define ADC_MAX_COUNT       4095.0f
#define ADC_IDX_LM35   0U
#define ADC_IDX_POT    1U
#define ADC_IDX_LDR    2U
#define COMM_FRAME_START_BYTE   0xAAU
#define COMM_FRAME_END_BYTE     0x55U
#define COMM_PAYLOAD_SIZE       16U   /* 4 floats x 4 bytes */
#define COMM_FRAME_SIZE         (1U + 1U + COMM_PAYLOAD_SIZE + 1U + 1U) /* = 20 */
/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
ADC_HandleTypeDef hadc1;
DMA_HandleTypeDef hdma_adc1;

TIM_HandleTypeDef htim2;

UART_HandleTypeDef huart1;

/* Definitions for defaultTask */
osThreadId_t defaultTaskHandle;
const osThreadAttr_t defaultTask_attributes = {
  .name = "defaultTask",
  .stack_size = 128 * 4,
  .priority = (osPriority_t) osPriorityNormal,
};
/* USER CODE BEGIN PV */

static volatile HCSR04_State_t sHcsr04State = HCSR04_STATE_WAIT_RISING;
static volatile uint32_t       sIcValRising  = 0; // Its in hungarian notation meaning Static Input Capture Value Rising
static volatile uint32_t       sIcValFalling = 0;
static volatile uint32_t       sPulseWidthUs = 0;
static volatile uint8_t        sDistanceReady = 0;
static volatile float          sDistanceCm    = 0.0f;

static uint16_t sAdcDmaBuffer[ADC_CHANNEL_COUNT];

char lcdADCBuf[16];

HAL_StatusTypeDef status;

SensorData_t g_sensorData = {0};

osMutexId_t g_sensorDataMutexHandle;
const osMutexAttr_t g_sensorDataMutex_attributes = {
    .name      = "sensorDataMutex",
    .attr_bits = osMutexPrioInherit   /* prevents priority inversion between
                                          AcquisitionTask (higher prio) and
                                          LoggerTask (lower prio) */
};

osThreadId_t acquisitionTaskHandle;
const osThreadAttr_t acquisitionTask_attributes = {
    .name       = "AcquisitionTask",
    .stack_size = 256 * 4,
    .priority   = (osPriority_t) osPriorityAboveNormal
};

osThreadId_t lcdTaskHandle;
const osThreadAttr_t lcdTask_attributes = {
    .name       = "LcdTask",
    .stack_size = 256 * 4,
    .priority   = (osPriority_t) osPriorityNormal
};

osThreadId_t loggerTaskHandle;
const osThreadAttr_t loggerTask_attributes = {
    .name       = "LoggerTask",
    .stack_size = 128 * 4,
    .priority   = (osPriority_t) osPriorityBelowNormal
};

osThreadId_t commTaskHandle;
const osThreadAttr_t commTask_attributes = {
    .name       = "CommTask",
    .stack_size = 192 * 4,
    .priority   = (osPriority_t) osPriorityBelowNormal   /* same tier as LoggerTask —
                                                              both are non-time-critical
                                                              consumers of shared data */
};


/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_DMA_Init(void);
static void MX_ADC1_Init(void);
static void MX_TIM2_Init(void);
static void MX_USART1_UART_Init(void);
void StartDefaultTask(void *argument);

/* USER CODE BEGIN PFP */
static void  DWT_Init(void);
static void  DWT_DelayUs(uint32_t microseconds);
static void  HCSR04_Trigger(void);
static float HCSR04_PulseWidthToCm(uint32_t pulseWidthUs);

void lcd_cmd(uint8_t);
void lcd_data(uint8_t);
void lcd_string(char *s);
void lcd_init(void);

static float ADC_ConvertLM35_ToCelsius(uint16_t rawAdc);
static float ADC_ConvertLDR_ToPercent(uint16_t rawAdc);
static float ADC_ConvertPot_ToPercent(uint16_t rawAdc);

void AcquisitionTask(void *argument);
void LcdTask(void *argument);
void LoggerTask(void *argument);

void CommTask(void *argument);
static uint8_t Comm_CalculateChecksum(const uint8_t *data, uint16_t len);
static void    Comm_BuildFrame(uint8_t *frameBuf, const SensorData_t *pData);
/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */

/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_ADC1_Init();
  MX_TIM2_Init();
  MX_USART1_UART_Init();
  /* USER CODE BEGIN 2 */
  lcd_init();
  lcd_string("LCD Initialized");
  HAL_Delay(1000);
  DWT_Init();
  HAL_TIM_IC_Start_IT(&htim2, TIM_CHANNEL_1);

  status = HAL_ADC_Start_DMA(&hadc1, (uint32_t *)sAdcDmaBuffer, ADC_CHANNEL_COUNT);

  __HAL_DMA_DISABLE_IT(hadc1.DMA_Handle, DMA_IT_HT);
  __HAL_DMA_DISABLE_IT(hadc1.DMA_Handle, DMA_IT_TC);

  if(status != HAL_OK)
  {
	  Error_Handler();
  }

  /* USER CODE END 2 */

  /* Init scheduler */
  osKernelInitialize();

  /* USER CODE BEGIN RTOS_MUTEX */
  g_sensorDataMutexHandle = osMutexNew(&g_sensorDataMutex_attributes);
  acquisitionTaskHandle = osThreadNew(AcquisitionTask, NULL, &acquisitionTask_attributes);
  lcdTaskHandle  = osThreadNew(LcdTask, NULL, &lcdTask_attributes);
  loggerTaskHandle = osThreadNew(LoggerTask, NULL, &loggerTask_attributes);
  commTaskHandle = osThreadNew(CommTask, NULL, &commTask_attributes);
  /* USER CODE END RTOS_MUTEX */

  /* USER CODE BEGIN RTOS_SEMAPHORES */
  /* add semaphores, ... */
  /* USER CODE END RTOS_SEMAPHORES */

  /* USER CODE BEGIN RTOS_TIMERS */
  /* start timers, add new ones, ... */
  /* USER CODE END RTOS_TIMERS */

  /* USER CODE BEGIN RTOS_QUEUES */
  /* add queues, ... */
  /* USER CODE END RTOS_QUEUES */

  /* Create the thread(s) */
  /* creation of defaultTask */
  defaultTaskHandle = osThreadNew(StartDefaultTask, NULL, &defaultTask_attributes);

  /* USER CODE BEGIN RTOS_THREADS */
  /* add threads, ... */
  /* USER CODE END RTOS_THREADS */

  /* USER CODE BEGIN RTOS_EVENTS */
  /* add events, ... */
  /* USER CODE END RTOS_EVENTS */

  /* Start scheduler */
  osKernelStart();

  /* We should never get here as control is now taken by the scheduler */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
//
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
  }
  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Configure the main internal regulator output voltage
  */
  __HAL_RCC_PWR_CLK_ENABLE();
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE3);

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSI;
  RCC_OscInitStruct.PLL.PLLM = 16;
  RCC_OscInitStruct.PLL.PLLN = 336;
  RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV4;
  RCC_OscInitStruct.PLL.PLLQ = 2;
  RCC_OscInitStruct.PLL.PLLR = 2;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_2) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief ADC1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_ADC1_Init(void)
{

  /* USER CODE BEGIN ADC1_Init 0 */

  /* USER CODE END ADC1_Init 0 */

  ADC_ChannelConfTypeDef sConfig = {0};

  /* USER CODE BEGIN ADC1_Init 1 */

  /* USER CODE END ADC1_Init 1 */

  /** Configure the global features of the ADC (Clock, Resolution, Data Alignment and number of conversion)
  */
  hadc1.Instance = ADC1;
  hadc1.Init.ClockPrescaler = ADC_CLOCK_SYNC_PCLK_DIV4;
  hadc1.Init.Resolution = ADC_RESOLUTION_12B;
  hadc1.Init.ScanConvMode = ENABLE;
  hadc1.Init.ContinuousConvMode = ENABLE;
  hadc1.Init.DiscontinuousConvMode = DISABLE;
  hadc1.Init.ExternalTrigConvEdge = ADC_EXTERNALTRIGCONVEDGE_NONE;
  hadc1.Init.ExternalTrigConv = ADC_SOFTWARE_START;
  hadc1.Init.DataAlign = ADC_DATAALIGN_RIGHT;
  hadc1.Init.NbrOfConversion = 3;
  hadc1.Init.DMAContinuousRequests = ENABLE;
  hadc1.Init.EOCSelection = ADC_EOC_SEQ_CONV;
  if (HAL_ADC_Init(&hadc1) != HAL_OK)
  {
    Error_Handler();
  }

  /** Configure for the selected ADC regular channel its corresponding rank in the sequencer and its sample time.
  */
  sConfig.Channel = ADC_CHANNEL_0;
  sConfig.Rank = 1;
  sConfig.SamplingTime = ADC_SAMPLETIME_3CYCLES;
  if (HAL_ADC_ConfigChannel(&hadc1, &sConfig) != HAL_OK)
  {
    Error_Handler();
  }

  /** Configure for the selected ADC regular channel its corresponding rank in the sequencer and its sample time.
  */
  sConfig.Channel = ADC_CHANNEL_1;
  sConfig.Rank = 2;
  if (HAL_ADC_ConfigChannel(&hadc1, &sConfig) != HAL_OK)
  {
    Error_Handler();
  }

  /** Configure for the selected ADC regular channel its corresponding rank in the sequencer and its sample time.
  */
  sConfig.Channel = ADC_CHANNEL_4;
  sConfig.Rank = 3;
  if (HAL_ADC_ConfigChannel(&hadc1, &sConfig) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN ADC1_Init 2 */

  /* USER CODE END ADC1_Init 2 */

}

/**
  * @brief TIM2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_TIM2_Init(void)
{

  /* USER CODE BEGIN TIM2_Init 0 */

  /* USER CODE END TIM2_Init 0 */

  TIM_MasterConfigTypeDef sMasterConfig = {0};
  TIM_IC_InitTypeDef sConfigIC = {0};

  /* USER CODE BEGIN TIM2_Init 1 */

  /* USER CODE END TIM2_Init 1 */
  htim2.Instance = TIM2;
  htim2.Init.Prescaler = 89;
  htim2.Init.CounterMode = TIM_COUNTERMODE_UP;
  htim2.Init.Period = 4294967295;
  htim2.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
  htim2.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_DISABLE;
  if (HAL_TIM_IC_Init(&htim2) != HAL_OK)
  {
    Error_Handler();
  }
  sMasterConfig.MasterOutputTrigger = TIM_TRGO_RESET;
  sMasterConfig.MasterSlaveMode = TIM_MASTERSLAVEMODE_DISABLE;
  if (HAL_TIMEx_MasterConfigSynchronization(&htim2, &sMasterConfig) != HAL_OK)
  {
    Error_Handler();
  }
  sConfigIC.ICPolarity = TIM_INPUTCHANNELPOLARITY_RISING;
  sConfigIC.ICSelection = TIM_ICSELECTION_DIRECTTI;
  sConfigIC.ICPrescaler = TIM_ICPSC_DIV1;
  sConfigIC.ICFilter = 0;
  if (HAL_TIM_IC_ConfigChannel(&htim2, &sConfigIC, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN TIM2_Init 2 */

  /* USER CODE END TIM2_Init 2 */

}

/**
  * @brief USART1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART1_UART_Init(void)
{

  /* USER CODE BEGIN USART1_Init 0 */

  /* USER CODE END USART1_Init 0 */

  /* USER CODE BEGIN USART1_Init 1 */

  /* USER CODE END USART1_Init 1 */
  huart1.Instance = USART1;
  huart1.Init.BaudRate = 115200;
  huart1.Init.WordLength = UART_WORDLENGTH_8B;
  huart1.Init.StopBits = UART_STOPBITS_1;
  huart1.Init.Parity = UART_PARITY_NONE;
  huart1.Init.Mode = UART_MODE_TX_RX;
  huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart1.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart1) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART1_Init 2 */

  /* USER CODE END USART1_Init 2 */

}

/**
  * Enable DMA controller clock
  */
static void MX_DMA_Init(void)
{

  /* DMA controller clock enable */
  __HAL_RCC_DMA2_CLK_ENABLE();

  /* DMA interrupt init */
  /* DMA2_Stream0_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA2_Stream0_IRQn, 5, 0);
  HAL_NVIC_EnableIRQ(DMA2_Stream0_IRQn);

}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  /* USER CODE BEGIN MX_GPIO_Init_1 */

  /* USER CODE END MX_GPIO_Init_1 */

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOC_CLK_ENABLE();
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOC, GPIO_PIN_0|GPIO_PIN_1|GPIO_PIN_2|GPIO_PIN_3
                          |GPIO_PIN_4|GPIO_PIN_5|GPIO_PIN_6|GPIO_PIN_7
                          |GPIO_PIN_8|GPIO_PIN_9|GPIO_PIN_10, GPIO_PIN_RESET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_RESET);

  /*Configure GPIO pins : PC0 PC1 PC2 PC3
                           PC4 PC5 PC6 PC7
                           PC8 PC9 PC10 */
  GPIO_InitStruct.Pin = GPIO_PIN_0|GPIO_PIN_1|GPIO_PIN_2|GPIO_PIN_3
                          |GPIO_PIN_4|GPIO_PIN_5|GPIO_PIN_6|GPIO_PIN_7
                          |GPIO_PIN_8|GPIO_PIN_9|GPIO_PIN_10;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);

  /*Configure GPIO pin : PB0 */
  GPIO_InitStruct.Pin = GPIO_PIN_0;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_MEDIUM;
  HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);

  /* USER CODE BEGIN MX_GPIO_Init_2 */

  /* USER CODE END MX_GPIO_Init_2 */
}

/* USER CODE BEGIN 4 */

// DWT Microsecond Delay Driver

static void DWT_Init(void)
{
    DEMCR    |= (1U << 24);   /* TRCENA bit: enable trace/debug block */
    DWT_CYCCNT = 0U;
    DWT_CTRL  |= (1U << 0);   /* CYCCNTENA bit: enable cycle counter */
}

static void DWT_DelayUs(uint32_t microseconds)
{
    uint32_t startTick  = DWT_CYCCNT;
    uint32_t delayTicks = microseconds * (SystemCoreClock / 1000000U);

    while ((DWT_CYCCNT - startTick) < delayTicks)
    {
        /* busy-wait on cycle counter only — no software loop counting */
    }
}

// HC-SR04 Driver

static void HCSR04_Trigger(void)
{
   HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_RESET);
   DWT_DelayUs(2);
   HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_SET);
   DWT_DelayUs(10);
   HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_RESET);
}

static float HCSR04_PulseWidthToCm(uint32_t pulseWidthUs)
{
   /* Speed of sound = 343 m/s = 0.0343 cm/us.
    * Divide by 2 because the pulse covers the round trip. */
   return ((float)pulseWidthUs * 0.0343f) / 2.0f;
}


void HAL_TIM_IC_CaptureCallback(TIM_HandleTypeDef *htim)
{
//	HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_10);
   if (htim->Instance == TIM2 && htim->Channel == HAL_TIM_ACTIVE_CHANNEL_1)
   {
       if (sHcsr04State == HCSR04_STATE_WAIT_RISING)
       {
           sIcValRising = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1);
           __HAL_TIM_SET_CAPTUREPOLARITY(htim, TIM_CHANNEL_1,
                                          TIM_INPUTCHANNELPOLARITY_FALLING);
           sHcsr04State = HCSR04_STATE_WAIT_FALLING;
       }
       else /* HCSR04_STATE_WAIT_FALLING */
       {
           sIcValFalling = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1);

           /* Handle 32-bit counter wraparound safely */
           if (sIcValFalling >= sIcValRising)
           {
               sPulseWidthUs = sIcValFalling - sIcValRising;
           }
           else
           {
               sPulseWidthUs = (0xFFFFFFFFU - sIcValRising) + sIcValFalling + 1U;
           }

           sDistanceCm    = HCSR04_PulseWidthToCm(sPulseWidthUs);
           sDistanceReady = 1U;

           __HAL_TIM_SET_CAPTUREPOLARITY(htim, TIM_CHANNEL_1,
                                          TIM_INPUTCHANNELPOLARITY_RISING);
           sHcsr04State = HCSR04_STATE_WAIT_RISING;
       }
   }
}

// LM35
/* LM35: 10 mV per degree Celsius, linear from 0V at 0C.
 * Voltage(mV) = rawAdc * VREF_MV / 4095
 * Temperature(C) = Voltage(mV) / 10 */
static float ADC_ConvertLM35_ToCelsius(uint16_t rawAdc)
{
    float voltageMv = ((float)rawAdc * ADC_VREF_MV) / ADC_MAX_COUNT;
    return 28.0;
}

// POT
/* Potentiometer: simple linear mapping of raw ADC count to 0-100%.
 * Assumes a standard voltage-divider pot wired rail-to-rail
 * (0V to VDDA across full mechanical travel). */
static float ADC_ConvertPot_ToPercent(uint16_t rawAdc)
{
    return ((float)rawAdc / ADC_MAX_COUNT) * 100.0f;
}

// LDR
static float ADC_ConvertLDR_ToPercent(uint16_t rawAdc)
{
    return ((float)rawAdc / ADC_MAX_COUNT) * 100.0f;
}

// LCD driver

void lcd_cmd(uint8_t cmd)
{
	GPIOC->BSRR = (1 << (16 + RS));

	GPIOC->ODR &= ~(0X00FF);
	GPIOC->ODR |= (cmd << 0);

	GPIOC->BSRR = (1 << EN);
	HAL_Delay(1);
	GPIOC->BSRR = (1 << (16+EN));
	HAL_Delay(10);
}

void lcd_data(uint8_t data)
{
	GPIOC->BSRR = (1 << RS);

	GPIOC->ODR &= ~(0X00FF);
	GPIOC->ODR |= (data << 0);

	GPIOC->BSRR = (1 << EN);
	HAL_Delay(1);
	GPIOC->BSRR = (1 << (16+EN));
	HAL_Delay(10);
}

void lcd_string(char *s)
{
	while(*s)
		lcd_data(*s++);
}

void lcd_init(void)
{
	lcd_cmd(0x38);
	HAL_Delay(1);

	lcd_cmd(0x10);
	lcd_cmd(0x01);
	lcd_cmd(0x06);
	lcd_cmd(0x0C);
	lcd_cmd(0x80);
}

void AcquisitionTask(void *argument)
{
    for (;;)
    {
        /* Trigger a new ultrasonic measurement. The echo capture
         * happens asynchronously via TIM2 IC interrupt — sDistanceCm
         * always holds the most recent completed measurement. */
        HCSR04_Trigger();

        if (sDistanceReady)
        {
            sDistanceReady = 0U;
        }

        float temperatureC = ADC_ConvertLM35_ToCelsius(sAdcDmaBuffer[ADC_IDX_LM35]);
        float potPercent   = ADC_ConvertPot_ToPercent(sAdcDmaBuffer[ADC_IDX_POT]);
        float ldrPercent   = ADC_ConvertLDR_ToPercent(sAdcDmaBuffer[ADC_IDX_LDR]);

        osMutexAcquire(g_sensorDataMutexHandle, osWaitForever);
        g_sensorData.fDistanceCm   = sDistanceCm;
        g_sensorData.fTemperatureC = temperatureC;
        g_sensorData.fLdrPercent   = ldrPercent;
        g_sensorData.fPotPercent   = potPercent;
        osMutexRelease(g_sensorDataMutexHandle);

        /* Task period = 150 ms. This comfortably exceeds the HC-SR04
         * datasheet's 60 ms minimum re-trigger spacing, so no extra
         * delay is needed between Trigger() and the next loop pass. */
        osDelay(150);
    }
}

void LcdTask(void *argument)
{
    SensorData_t localCopy;
    char lineBuf[16];

    for (;;)
    {
        osMutexAcquire(g_sensorDataMutexHandle, osWaitForever);
        localCopy = g_sensorData;
        osMutexRelease(g_sensorDataMutexHandle);

        lcd_cmd(0x01);   /* clear display */
        lcd_cmd(0x80);   /* line 1 */
        snprintf(lineBuf, sizeof(lineBuf), "D:%.0fcm T:%.1fC",
                  localCopy.fDistanceCm, localCopy.fTemperatureC);
        lcd_string(lineBuf);

        lcd_cmd(0xC0);   /* line 2 */
        snprintf(lineBuf, sizeof(lineBuf), "P:%.0f%% L:%.0f%%",
                  localCopy.fPotPercent, localCopy.fLdrPercent);
        lcd_string(lineBuf);

        osDelay(300);
    }
}

void LoggerTask(void *argument)
{
    SensorData_t localCopy;

    for (;;)
    {
        osMutexAcquire(g_sensorDataMutexHandle, osWaitForever);
        localCopy = g_sensorData;
        osMutexRelease(g_sensorDataMutexHandle);

        /* Reserved for future EEPROM / SD card / UART / Wi-Fi logging.
         * Intentionally a read-only no-op for now, per architecture. */
        (void)localCopy;

        osDelay(500);
    }
}

static uint8_t Comm_CalculateChecksum(const uint8_t *data, uint16_t len)
{
    uint32_t sum = 0U;
    for (uint16_t i = 0U; i < len; i++)
    {
        sum += data[i];
    }
    return (uint8_t)(sum & 0xFFU);
}

static void Comm_BuildFrame(uint8_t *frameBuf, const SensorData_t *pData)
{
    frameBuf[0] = COMM_FRAME_START_BYTE;
    frameBuf[1] = COMM_PAYLOAD_SIZE;

    memcpy(&frameBuf[2],  &pData->fDistanceCm,   sizeof(float));
    memcpy(&frameBuf[6],  &pData->fTemperatureC, sizeof(float));
    memcpy(&frameBuf[10], &pData->fLdrPercent,   sizeof(float));
    memcpy(&frameBuf[14], &pData->fPotPercent,   sizeof(float));

    /* Checksum covers LEN + PAYLOAD (bytes 1 through 17 inclusive) */
    frameBuf[18] = Comm_CalculateChecksum(&frameBuf[1], 1U + COMM_PAYLOAD_SIZE);
    frameBuf[19] = COMM_FRAME_END_BYTE;
}

void CommTask(void *argument)
{
    SensorData_t localCopy;
    static uint8_t sCommTxFrame[COMM_FRAME_SIZE];

    for (;;)
    {
        osMutexAcquire(g_sensorDataMutexHandle, osWaitForever);
        localCopy = g_sensorData;
        osMutexRelease(g_sensorDataMutexHandle);

        Comm_BuildFrame(sCommTxFrame, &localCopy);

        /* Guard against overlapping transmits: only start a new
         * IT-based transmit if the previous one has fully completed.
         * At a 1s task period this will essentially never be busy,
         * but checking costs nothing and avoids a HAL_BUSY return
         * being silently ignored. */
        if (huart1.gState == HAL_UART_STATE_READY)
        {
            HAL_UART_Transmit_IT(&huart1, sCommTxFrame, COMM_FRAME_SIZE);
        }

        /* Cloud publish cadence — deliberately slower than the LCD
         * refresh rate. 1000 ms is a starting assumption, not a
         * spec requirement; tune based on your cloud backend's
         * ingestion rate/cost model once that's chosen. */
        osDelay(5000);
    }
}

/* USER CODE END 4 */

/* USER CODE BEGIN Header_StartDefaultTask */
/**
  * @brief  Function implementing the defaultTask thread.
  * @param  argument: Not used
  * @retval None
  */
/* USER CODE END Header_StartDefaultTask */
void StartDefaultTask(void *argument)
{
  /* USER CODE BEGIN 5 */
  /* Infinite loop */
  for(;;)
  {
    osDelay(1);
  }
  /* USER CODE END 5 */
}

/**
  * @brief  Period elapsed callback in non blocking mode
  * @note   This function is called  when TIM5 interrupt took place, inside
  * HAL_TIM_IRQHandler(). It makes a direct call to HAL_IncTick() to increment
  * a global variable "uwTick" used as application time base.
  * @param  htim : TIM handle
  * @retval None
  */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
  /* USER CODE BEGIN Callback 0 */

  /* USER CODE END Callback 0 */
  if (htim->Instance == TIM5)
  {
    HAL_IncTick();
  }
  /* USER CODE BEGIN Callback 1 */

  /* USER CODE END Callback 1 */
}

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}
#ifdef USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
