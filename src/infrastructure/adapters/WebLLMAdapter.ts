import * as webllm from "@mlc-ai/web-llm";

export type LoadingCallback = (progress: number, label: string) => void;

/**
 * WebLLMAdapter
 * Infrastructure adapter for local, browser-native AI inference.
 * Manages the lifecycle of the Gemma-3-1B model weights.
 */
export class WebLLMAdapter {
  private static instance: WebLLMAdapter;
  private engine: webllm.MLCEngineInterface | null = null;
  private primaryModelId = "gemma-2-2b-it-q4f16_1-MLC"; 
  private fallbackModelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC"; // Lighter model for mobile/constrained nodes
  private activeModelId = "";
  
  private constructor() {}

  static getInstance(): WebLLMAdapter {
    if (!WebLLMAdapter.instance) {
      WebLLMAdapter.instance = new WebLLMAdapter();
    }
    return WebLLMAdapter.instance;
  }

  /**
   * Initializes the WebGPU engine and downloads model weights if necessary
   */
  async initialize(onProgress?: LoadingCallback): Promise<void> {
    if (this.engine) return;

    try {
      this.activeModelId = this.primaryModelId;
      this.engine = await webllm.CreateMLCEngine(this.primaryModelId, {
        initProgressCallback: (report: webllm.InitProgressReport) => {
          if (onProgress) {
            onProgress(report.progress, report.text);
          }
        }
      });
    } catch (error) {
      console.warn(`[WebLLM] Primary model ${this.primaryModelId} failed. Adapting to lighter node constraints...`, error);
      this.activeModelId = this.fallbackModelId;
      this.engine = await webllm.CreateMLCEngine(this.fallbackModelId, {
        initProgressCallback: (report: webllm.InitProgressReport) => {
          if (onProgress) {
            onProgress(report.progress, `[Adaptive Mode] ${report.text}`);
          }
        }
      });
    }
  }

  /**
   * Generates a conversational response from a prompt
   */
  async generateResponse(systemPrompt: string, userQuery: string): Promise<string> {
    if (!this.engine) {
      throw new Error("WebLLM Engine not initialized. Call initialize() first.");
    }

    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery }
    ];

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: 0.2, // Low temperature for clinical precision
      max_tokens: 512
    });

    return reply.choices[0].message.content || "";
  }

  /**
   * Returns a streaming response for better UX
   */
  async *generateStream(systemPrompt: string, userQuery: string) {
    if (!this.engine) throw new Error("WebLLM Engine not initialized.");

    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery }
    ];

    const asyncChunkGenerator = await this.engine.chat.completions.create({
      messages,
      temperature: 0.2,
      stream: true,
      max_tokens: 512
    });

    for await (const chunk of asyncChunkGenerator) {
      if (chunk.choices[0].delta.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  }
}
