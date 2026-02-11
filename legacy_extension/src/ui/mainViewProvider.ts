import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';
import { LLMService } from '../llm/llmService';
import { OllamaSetupManager } from '../llm/ollamaSetup';
import { ReviewEngine } from '../review/reviewEngine';

export class MainViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiCodeReview.mainView';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly authService: AuthService,
        private readonly llmService: LLMService,
        private readonly ollamaSetup: OllamaSetupManager,
        private readonly reviewEngine: ReviewEngine
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'checkStatus':
                    await this.checkStatus();
                    break;
                case 'configureLLM':
                    await vscode.commands.executeCommand('aiCodeReview.configureLLM');
                    await this.checkStatus();
                    break;
                case 'loginGitLab':
                    await vscode.commands.executeCommand('aiCodeReview.loginGitLab');
                    await this.checkStatus();
                    break;
                case 'startScan':
                    // Trigger scan logic (simplified for now calling existing commands or direct logic)
                    await vscode.commands.executeCommand('aiCodeReview.scanWorkspace');
                    // In a real full GUI, we'd capture the output and send back to UI
                    this._view?.webview.postMessage({ type: 'scanComplete', plan: 'Plan generated...' });
                    break;
                case 'startReview':
                    await vscode.commands.executeCommand('aiCodeReview.approveReviewPlan');
                    break;
                case 'stopReview':
                    await vscode.commands.executeCommand('aiCodeReview.stopReview');
                    break;
                case 'publish':
                    await vscode.commands.executeCommand('aiCodeReview.publishToSCM');
                    break;
            }
        });
    }

    private async checkStatus() {
        const llmConfig = vscode.workspace.getConfiguration('aiCodeReview');
        const provider = llmConfig.get<string>('llmProvider');
        const model = llmConfig.get<string>('llmModel');
        const user = this.authService.getCurrentSession();

        let ollamaStatus = false;
        if (provider === 'ollama') {
            ollamaStatus = await this.ollamaSetup.checkRunning();
        }

        this._view?.webview.postMessage({
            type: 'statusUpdate',
            status: {
                provider,
                model,
                ollamaRunning: ollamaStatus,
                user: user ? user.userName : null,
                scmProvider: user ? user.provider : null
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Code Review</title>
            <style>
                body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-foreground); }
                .step { border-left: 2px solid var(--vscode-button-background); padding-left: 10px; margin-bottom: 20px; }
                .step-title { font-weight: bold; margin-bottom: 5px; text-transform: uppercase; font-size: 0.8em; color: var(--vscode-descriptionForeground); }
                .card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); padding: 10px; border-radius: 4px; margin-bottom: 10px; }
                button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; cursor: pointer; width: 100%; margin-bottom: 5px; border-radius: 2px; }
                button:hover { background: var(--vscode-button-hoverBackground); }
                button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                .status-badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 0.8em; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
                .hidden { display: none; }
                .success { color: var(--vscode-testing-iconPassed); }
                .error { color: var(--vscode-testing-iconFailed); }
            </style>
        </head>
        <body>
            <h2>🤖 AI Review Assistant</h2>
            
            <!-- STEP 1: SETUP -->
            <div class="step" id="step-setup">
                <div class="step-title">1. Cấu Hình & Kết Nối</div>
                <div class="card">
                    <div>LLM: <span id="llm-status">Checking...</span></div>
                    <div>SCM: <span id="scm-status">Checking...</span></div>
                    <br>
                    <button class="secondary" onclick="sendMessage('configureLLM')">⚙️ Cấu hình LLM</button>
                    <div style="display: flex; gap: 5px;">
                        <button class="secondary" onclick="sendMessage('loginGitLab')">🦊 GitLab</button>
                        <button class="secondary" onclick="sendMessage('loginGitHub')">🐱 GitHub</button>
                    </div>
                </div>
            </div>

            <!-- STEP 2: SCOPE -->
            <div class="step" id="step-scope">
                <div class="step-title">2. Phạm Vi Review</div>
                <div class="card">
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="radio" name="scope" value="workspace" checked> Workspace hiện tại
                    </label>
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="radio" name="scope" value="url"> URL (MR/PR)
                    </label>
                    <button onclick="sendMessage('startScan')">🔍 Quét & Lập Kế Hoạch</button>
                </div>
            </div>

            <!-- STEP 3: EXECUTE -->
            <div class="step" id="step-execute">
                <div class="step-title">3. Thực Thi</div>
                <div class="card">
                    <p>Đã tạo xong kế hoạch review.</p>
                    <button onclick="sendMessage('startReview')">▶️ Duyệt Plan & Bắt đầu Review</button>
                    <button class="secondary" onclick="sendMessage('stopReview')">🛑 Dừng Review</button>
                </div>
            </div>

            <!-- STEP 4: RESULT -->
            <div class="step" id="step-result">
                <div class="step-title">4. Kết Quả</div>
                <div class="card">
                    <div id="result-summary">Chưa có kết quả.</div>
                    <br>
                    <button onclick="sendMessage('publish')">🚀 Đẩy Comment lên SCM</button>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function sendMessage(type, payload) {
                    vscode.postMessage({ type, ...payload });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'statusUpdate':
                            updateStatus(message.status);
                            break;
                        case 'scanComplete':
                            // Enable Step 3
                            break;
                    }
                });

                function updateStatus(status) {
                    const llmEl = document.getElementById('llm-status');
                    llmEl.textContent = status.provider + (status.ollamaRunning ? ' (Running)' : '');
                    
                    const scmEl = document.getElementById('scm-status');
                    if (status.user) {
                        scmEl.textContent = status.user + ' (' + status.scmProvider + ')';
                        scmEl.className = 'success';
                    } else {
                        scmEl.textContent = 'Chưa đăng nhập';
                        scmEl.className = '';
                    }
                }

                // Initial check
                sendMessage('checkStatus');
                
                // Poll status every 5s
                setInterval(() => sendMessage('checkStatus'), 5000);
            </script>
        </body>
        </html>`;
    }
}
