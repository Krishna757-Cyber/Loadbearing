import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
} from "@aws-sdk/client-bedrock-runtime";
import { logger } from "../server.js";

export interface CircuitBreakerState {
  failures: number;
  openUntilMs: number;
}

export class BedrockClientWrapper {
  private client: BedrockRuntimeClient | null = null;
  private modelId: string | null = null;
  private circuitBreaker: CircuitBreakerState = { failures: 0, openUntilMs: 0 };
  private warnedMissing = false;

  constructor() {
    this.modelId = process.env.BEDROCK_MODEL_ID ?? null;
    const region = process.env.AWS_REGION ?? "us-east-1";

    if (!this.modelId) {
      if (!this.warnedMissing) {
        logger.warn(
          "BEDROCK_MODEL_ID not configured in environment. AI agents will run in rules fallback mode."
        );
        this.warnedMissing = true;
      }
      return;
    }

    try {
      this.client = new BedrockRuntimeClient({ region });
    } catch (err: unknown) {
      logger.warn({ err }, "Could not initialize Bedrock client. Falling back to rules.");
      this.client = null;
    }
  }

  isAvailable(): boolean {
    if (!this.client || !this.modelId) return false;
    if (this.circuitBreaker.openUntilMs > Date.now()) {
      return false; // Circuit breaker open
    }
    return true;
  }

  private recordSuccess(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.openUntilMs = 0;
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    if (this.circuitBreaker.failures >= 3) {
      this.circuitBreaker.openUntilMs = Date.now() + 60 * 1000; // 60s cooldown
      logger.warn(
        `Bedrock circuit breaker tripped after 3 consecutive failures. Falling back to rules for 60s.`
      );
    }
  }

  async converse(options: {
    systemPrompt: string;
    userText: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }): Promise<string | null> {
    if (!this.isAvailable() || !this.client || !this.modelId) {
      return null;
    }

    const {
      systemPrompt,
      userText,
      temperature = 0,
      maxTokens = 400,
      timeoutMs = 8000,
    } = options;

    const input: ConverseCommandInput = {
      modelId: this.modelId,
      system: [{ text: systemPrompt }],
      messages: [
        {
          role: "user",
          content: [{ text: userText }],
        },
      ],
      inferenceConfig: {
        maxTokens,
        temperature,
      },
    };

    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const command = new ConverseCommand(input);
        const response = await this.client.send(command, {
          abortSignal: controller.signal,
        });

        clearTimeout(timeout);

        const outputText = response.output?.message?.content?.[0]?.text;
        if (outputText) {
          this.recordSuccess();
          return outputText;
        }
        return null;
      } catch (err: unknown) {
        const error = err as Error;
        const isThrottling =
          error.name === "ThrottlingException" ||
          error.name === "ModelNotReadyException" ||
          error.message.includes("throttled");

        if (isThrottling && attempt < maxAttempts) {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }

        this.recordFailure();
        logger.warn({ err: error.message }, "Bedrock Converse call failed");
        return null;
      }
    }

    return null;
  }
}

let bedrockClientInstance: BedrockClientWrapper | null = null;

export function getBedrockClient(): BedrockClientWrapper {
  if (!bedrockClientInstance) {
    bedrockClientInstance = new BedrockClientWrapper();
  }
  return bedrockClientInstance;
}

export function setBedrockClient(client: BedrockClientWrapper | null): void {
  bedrockClientInstance = client;
}
