import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

export class OllamaSetupManager {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AI Code Review - Ollama Setup');
    }

    /**
     * Kiểm tra và cài đặt Ollama + model nếu chưa có.
     * @returns true nếu sẵn sàng sử dụng
     */
    async ensureReady(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('aiCodeReview');
        const endpoint = config.get<string>('ollamaEndpoint') || 'http://localhost:11434';
        const model = config.get<string>('llmModel') || 'qwen2.5-coder:7b';

        this.outputChannel.show(true);
        this.log('🔍 Kiểm tra Ollama...');

        // Step 1: Kiểm tra Ollama đã cài chưa
        const installed = await this.isOllamaInstalled();
        if (!installed) {
            const shouldInstall = await vscode.window.showInformationMessage(
                'Ollama chưa được cài đặt. Bạn có muốn cài đặt tự động không?',
                'Cài đặt', 'Hủy'
            );
            if (shouldInstall !== 'Cài đặt') {
                vscode.window.showWarningMessage('Cần Ollama để sử dụng LLM local. Vui lòng cài đặt thủ công: https://ollama.ai');
                return false;
            }
            const installOk = await this.installOllama();
            if (!installOk) { return false; }
        }

        // Step 2: Kiểm tra Ollama server đang chạy chưa
        const running = await this.isOllamaRunning(endpoint);
        if (!running) {
            this.log('🚀 Khởi động Ollama server...');
            await this.startOllamaServer();
            // Chờ server sẵn sàng
            let retries = 10;
            while (retries > 0) {
                await this.sleep(2000);
                if (await this.isOllamaRunning(endpoint)) { break; }
                retries--;
            }
            if (retries === 0) {
                this.log('❌ Không thể khởi động Ollama server.');
                vscode.window.showErrorMessage('Không thể khởi động Ollama. Vui lòng chạy `ollama serve` thủ công.');
                return false;
            }
        }
        this.log('✅ Ollama server đang chạy.');

        // Step 3: Kiểm tra model đã pull chưa
        const hasModel = await this.isModelAvailable(endpoint, model);
        if (!hasModel) {
            const shouldPull = await vscode.window.showInformationMessage(
                `Model "${model}" chưa được tải. Tải xuống ngay? (có thể mất vài phút)`,
                'Tải xuống', 'Hủy'
            );
            if (shouldPull !== 'Tải xuống') { return false; }

            const pullOk = await this.pullModel(endpoint, model);
            if (!pullOk) { return false; }
        }

        this.log(`✅ Ollama sẵn sàng với model: ${model}`);
        vscode.window.showInformationMessage(`✅ Ollama sẵn sàng! Model: ${model}`);
        return true;
    }

    /**
     * Kiểm tra Ollama server có đang chạy không (public).
     */
    async checkRunning(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('aiCodeReview');
        const endpoint = config.get<string>('ollamaEndpoint') || 'http://localhost:11434';
        return this.isOllamaRunning(endpoint);
    }

    /**
     * Dừng Ollama server để giải phóng tài nguyên (RAM/GPU).
     * @returns true nếu đã stop thành công hoặc Ollama không chạy
     */
    async stopOllama(): Promise<boolean> {
        const running = await this.checkRunning();
        if (!running) {
            this.log('ℹ️ Ollama không đang chạy — không cần stop.');
            return true;
        }

        this.log('🛑 Đang dừng Ollama server...');
        try {
            // Thử dùng `ollama stop` trước (Ollama >= 0.5)
            try {
                await execAsync('ollama stop', { timeout: 5000 });
            } catch {
                // Ollama cũ không có lệnh stop → dùng pkill
            }

            // Chắc chắn kill process ollama serve
            try {
                await execAsync('pkill -f "ollama serve"', { timeout: 5000 });
            } catch {
                // Có thể đã stop rồi
            }

            // Fallback: kill bằng PID
            try {
                await execAsync('pkill ollama', { timeout: 5000 });
            } catch {
                // Bỏ qua nếu không tìm thấy
            }

            // Chờ server tắt hoàn toàn
            let retries = 5;
            while (retries > 0) {
                await this.sleep(1000);
                const stillRunning = await this.checkRunning();
                if (!stillRunning) {
                    this.log('✅ Ollama đã dừng thành công — tài nguyên đã giải phóng.');
                    return true;
                }
                retries--;
            }

            this.log('⚠️ Ollama vẫn đang chạy sau khi thử stop.');
            return false;
        } catch (err: any) {
            this.log(`❌ Lỗi khi dừng Ollama: ${err.message}`);
            return false;
        }
    }

    /**
     * Dispose output channel.
     */
    dispose(): void {
        this.outputChannel.dispose();
    }

    private async isOllamaInstalled(): Promise<boolean> {
        try {
            await execAsync('which ollama');
            this.log('✅ Ollama đã được cài đặt.');
            return true;
        } catch {
            this.log('⚠️ Ollama chưa được cài đặt.');
            return false;
        }
    }

    private async installOllama(): Promise<boolean> {
        try {
            this.log('📦 Đang cài đặt Ollama...');

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Đang cài đặt Ollama...',
                    cancellable: false
                },
                async () => {
                    // macOS: dùng brew hoặc curl
                    try {
                        await execAsync('brew --version');
                        this.log('Sử dụng Homebrew...');
                        await execAsync('brew install ollama', { timeout: 300000 });
                    } catch {
                        this.log('Sử dụng curl installer...');
                        await execAsync('curl -fsSL https://ollama.ai/install.sh | sh', { timeout: 300000 });
                    }
                }
            );

            this.log('✅ Ollama đã cài đặt thành công!');
            return true;
        } catch (err: any) {
            this.log(`❌ Lỗi cài đặt Ollama: ${err.message}`);
            vscode.window.showErrorMessage(`Lỗi cài đặt Ollama: ${err.message}. Vui lòng cài đặt thủ công.`);
            return false;
        }
    }

    private async isOllamaRunning(endpoint: string): Promise<boolean> {
        try {
            const res = await axios.get(endpoint, { timeout: 3000 });
            return res.status === 200;
        } catch {
            return false;
        }
    }

    private async startOllamaServer(): Promise<void> {
        try {
            // Chạy nền, không đợi
            exec('ollama serve', (err) => {
                if (err) { console.error('Ollama serve error:', err.message); }
            });
        } catch {
            // Bỏ qua
        }
    }

    private async isModelAvailable(endpoint: string, model: string): Promise<boolean> {
        try {
            const res = await axios.get(`${endpoint}/api/tags`, { timeout: 5000 });
            const models = res.data?.models || [];
            const modelName = model.split(':')[0]; // "qwen2.5-coder:7b" -> "qwen2.5-coder"
            return models.some((m: any) =>
                m.name === model || m.name.startsWith(modelName)
            );
        } catch {
            return false;
        }
    }

    private async pullModel(endpoint: string, model: string): Promise<boolean> {
        try {
            this.log(`📥 Đang tải model ${model}...`);

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Đang tải model ${model}...`,
                    cancellable: false
                },
                async (progress) => {
                    // Pull model qua API
                    const response = await axios.post(`${endpoint}/api/pull`, {
                        name: model,
                        stream: false
                    }, { timeout: 600000 }); // 10 phút timeout

                    if (response.data?.status === 'success' || response.status === 200) {
                        this.log(`✅ Model ${model} đã tải thành công!`);
                    }
                }
            );

            return true;
        } catch (err: any) {
            this.log(`❌ Lỗi tải model: ${err.message}`);
            vscode.window.showErrorMessage(`Lỗi tải model ${model}: ${err.message}`);
            return false;
        }
    }

    private log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
