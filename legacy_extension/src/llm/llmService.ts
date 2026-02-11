import * as vscode from 'vscode';
import axios from 'axios';

export interface LLMResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
}

export interface ReviewComment {
    line: number;
    endLine?: number;
    comment: string;
    severity: 'info' | 'warning' | 'error';
    suggestion?: string;
}

export interface LLMProvider {
    name: string;
    chat(systemPrompt: string, userPrompt: string): Promise<LLMResponse>;
}

// ==================== OpenAI Provider ====================
class OpenAIProvider implements LLMProvider {
    name = 'OpenAI';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        this.model = model || 'gpt-4o';
    }

    async chat(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 4096
            },
            { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } }
        );

        return {
            content: response.data.choices[0].message.content,
            usage: {
                promptTokens: response.data.usage?.prompt_tokens || 0,
                completionTokens: response.data.usage?.completion_tokens || 0
            }
        };
    }
}

// ==================== Gemini Provider ====================
class GeminiProvider implements LLMProvider {
    name = 'Google Gemini';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        this.model = model || 'gemini-1.5-pro';
    }

    async chat(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
            {
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: userPrompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
            }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return {
            content: text,
            usage: {
                promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
                completionTokens: response.data.usageMetadata?.candidatesTokenCount || 0
            }
        };
    }
}

// ==================== Claude Provider ====================
class ClaudeProvider implements LLMProvider {
    name = 'Anthropic Claude';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        this.model = model || 'claude-3-5-sonnet-20241022';
    }

    async chat(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: this.model,
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            },
            {
                headers: {
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                }
            }
        );

        const text = response.data.content?.[0]?.text || '';
        return {
            content: text,
            usage: {
                promptTokens: response.data.usage?.input_tokens || 0,
                completionTokens: response.data.usage?.output_tokens || 0
            }
        };
    }
}

// ==================== Ollama Provider ====================
class OllamaProvider implements LLMProvider {
    name = 'Ollama (Local)';
    private endpoint: string;
    private model: string;

    constructor(endpoint: string, model?: string) {
        this.endpoint = endpoint;
        this.model = model || 'deepseek-coder-v2';
    }

    async chat(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
        const response = await axios.post(`${this.endpoint}/api/chat`, {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            stream: false,
            options: { temperature: 0.3 }
        });

        return { content: response.data.message?.content || '' };
    }
}

// ==================== LLM Service (Facade) ====================
export class LLMService {
    private context: vscode.ExtensionContext;
    private provider: LLMProvider | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Lưu API Key vào SecretStorage.
     */
    async storeApiKey(providerName: string, key: string): Promise<void> {
        await this.context.secrets.store(`aiCodeReview.llm.${providerName}`, key);
    }

    /**
     * Lấy API Key từ SecretStorage.
     */
    private async getApiKey(providerName: string): Promise<string | undefined> {
        return await this.context.secrets.get(`aiCodeReview.llm.${providerName}`);
    }

    /**
     * Khởi tạo provider dựa trên settings hiện tại.
     */
    async getProvider(): Promise<LLMProvider> {
        if (this.provider) { return this.provider; }

        const config = vscode.workspace.getConfiguration('aiCodeReview');
        const providerName = config.get<string>('llmProvider') || 'openai';
        const model = config.get<string>('llmModel') || undefined;

        if (providerName === 'ollama') {
            const endpoint = config.get<string>('ollamaEndpoint') || 'http://localhost:11434';
            this.provider = new OllamaProvider(endpoint, model);
            return this.provider;
        }

        // Cloud providers: cần API Key
        let apiKey = await this.getApiKey(providerName);

        // Cũng kiểm tra setting (cho backward compatibility)
        if (!apiKey) {
            apiKey = config.get<string>('llmApiKey');
        }

        if (!apiKey) {
            // Hỏi người dùng nhập
            apiKey = await vscode.window.showInputBox({
                prompt: `Nhập API Key cho ${providerName}`,
                password: true,
                ignoreFocusOut: true,
                placeHolder: providerName === 'openai' ? 'sk-...' : 'API Key...'
            });

            if (!apiKey) {
                throw new Error('Cần API Key để sử dụng LLM. Chạy lệnh "AI Review: Cấu hình LLM".');
            }

            await this.storeApiKey(providerName, apiKey);
        }

        switch (providerName) {
            case 'openai':
                this.provider = new OpenAIProvider(apiKey, model);
                break;
            case 'gemini':
                this.provider = new GeminiProvider(apiKey, model);
                break;
            case 'claude':
                this.provider = new ClaudeProvider(apiKey, model);
                break;
            default:
                throw new Error(`Provider không được hỗ trợ: ${providerName}`);
        }

        return this.provider;
    }

    /**
     * Gọi LLM với system + user prompt.
     */
    async chat(systemPrompt: string, userPrompt: string): Promise<string> {
        const provider = await this.getProvider();
        const response = await provider.chat(systemPrompt, userPrompt);
        return response.content;
    }

    /**
     * Reset provider (khi user thay đổi settings).
     */
    resetProvider(): void {
        this.provider = null;
    }
}
