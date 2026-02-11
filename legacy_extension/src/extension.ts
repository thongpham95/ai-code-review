import * as vscode from 'vscode';
import { AuthService } from './auth/authService';
import { LLMService } from './llm/llmService';
import { OllamaSetupManager } from './llm/ollamaSetup';
import { Scanner } from './scanner/scanner';
import { ReviewEngine } from './review/reviewEngine';
import { SCMPublisher } from './review/scmPublisher';
import { PRDescriptionGenerator } from './review/prDescriptionGenerator';
import { StatusBarManager } from './ui/statusBar';
import { MainViewProvider } from './ui/mainViewProvider';

let authService: AuthService;
let llmService: LLMService;
let ollamaSetup: OllamaSetupManager;
let scanner: Scanner;
let reviewEngine: ReviewEngine;
let scmPublisher: SCMPublisher;
let prDescGenerator: PRDescriptionGenerator;
let statusBar: StatusBarManager;

// Lưu URL MR/PR hiện tại
let currentMrUrl: string | undefined;
// Flag: review đang chạy
let isReviewRunning = false;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Code Review extension activated');

    // Khởi tạo services
    authService = new AuthService(context);
    llmService = new LLMService(context);
    ollamaSetup = new OllamaSetupManager();
    scanner = new Scanner(llmService);
    reviewEngine = new ReviewEngine(llmService, authService);
    scmPublisher = new SCMPublisher(authService);
    prDescGenerator = new PRDescriptionGenerator(llmService, authService);
    statusBar = new StatusBarManager();

    // === COMMANDS ===

    // 1. Đăng nhập GitHub
    const loginGitHub = vscode.commands.registerCommand(
        'aiCodeReview.loginGitHub',
        async () => {
            try {
                statusBar.showProgress('Đang đăng nhập GitHub...');
                const session = await authService.loginGitHub();
                vscode.window.showInformationMessage(
                    `✅ Đã đăng nhập GitHub: ${session.account.label}`
                );
                statusBar.showUser(session.account.label, 'github');
            } catch (err: any) {
                vscode.window.showErrorMessage(`❌ Lỗi đăng nhập GitHub: ${err.message}`);
                statusBar.reset();
            }
        }
    );

    // 2. Đăng nhập GitLab
    const loginGitLab = vscode.commands.registerCommand(
        'aiCodeReview.loginGitLab',
        async () => {
            try {
                statusBar.showProgress('Đang đăng nhập GitLab...');
                const user = await authService.loginGitLab();
                vscode.window.showInformationMessage(
                    `✅ Đã đăng nhập GitLab: ${user.name}`
                );
                statusBar.showUser(user.name, 'gitlab');
            } catch (err: any) {
                vscode.window.showErrorMessage(`❌ Lỗi đăng nhập GitLab: ${err.message}`);
                statusBar.reset();
            }
        }
    );

    // 3. Quét & Phân tích Workspace
    const scanWorkspace = vscode.commands.registerCommand(
        'aiCodeReview.scanWorkspace',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('Vui lòng mở một thư mục trước.');
                return;
            }

            try {
                statusBar.showProgress('Đang quét workspace...');
                const analysis = await scanner.scanWorkspace(workspaceFolder.uri.fsPath);

                const planPath = vscode.Uri.joinPath(workspaceFolder.uri, 'REVIEW_PLAN.md');
                await vscode.workspace.fs.writeFile(
                    planPath,
                    Buffer.from(analysis.reviewPlan, 'utf-8')
                );

                const doc = await vscode.workspace.openTextDocument(planPath);
                await vscode.window.showTextDocument(doc, { preview: false });

                vscode.window.showInformationMessage(
                    '✅ Đã tạo REVIEW_PLAN.md — Vui lòng xem & chỉnh sửa, sau đó chạy "Duyệt Kế Hoạch Review".'
                );
                statusBar.showReady();
            } catch (err: any) {
                vscode.window.showErrorMessage(`❌ Lỗi quét workspace: ${err.message}`);
                statusBar.reset();
            }
        }
    );

    // 4. Review từ URL
    const reviewFromUrl = vscode.commands.registerCommand(
        'aiCodeReview.reviewFromUrl',
        async () => {
            const url = await vscode.window.showInputBox({
                prompt: 'Dán URL Merge Request / Pull Request',
                placeHolder: 'https://gitlab.com/user/repo/-/merge_requests/1',
                validateInput: (value) => {
                    if (!value) { return 'URL không được để trống'; }
                    try {
                        new URL(value);
                        return null;
                    } catch {
                        return 'URL không hợp lệ';
                    }
                }
            });

            if (!url) { return; }
            currentMrUrl = url;

            try {
                statusBar.showProgress('Đang tải nội dung từ URL...');
                const analysis = await scanner.scanFromUrl(url, authService);

                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    const planPath = vscode.Uri.joinPath(workspaceFolder.uri, 'REVIEW_PLAN.md');
                    await vscode.workspace.fs.writeFile(
                        planPath,
                        Buffer.from(analysis.reviewPlan, 'utf-8')
                    );
                    const doc = await vscode.workspace.openTextDocument(planPath);
                    await vscode.window.showTextDocument(doc, { preview: false });
                }

                vscode.window.showInformationMessage(
                    '✅ Đã phân tích URL — Xem REVIEW_PLAN.md, sau đó chạy "Duyệt Kế Hoạch Review".'
                );
                statusBar.showReady();
            } catch (err: any) {
                vscode.window.showErrorMessage(`❌ Lỗi: ${err.message}`);
                statusBar.reset();
            }
        }
    );

    // 5. Duyệt Kế Hoạch Review (Approve Review Plan) — NEW
    const approveReviewPlan = vscode.commands.registerCommand(
        'aiCodeReview.approveReviewPlan',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('Vui lòng mở một thư mục trước.');
                return;
            }

            const planPath = vscode.Uri.joinPath(workspaceFolder.uri, 'REVIEW_PLAN.md');
            try {
                await vscode.workspace.fs.stat(planPath);
            } catch {
                vscode.window.showWarningMessage('Chưa có REVIEW_PLAN.md. Vui lòng chạy "Quét Workspace" trước.');
                return;
            }

            const approval = await vscode.window.showInformationMessage(
                'Bạn đã xem và duyệt REVIEW_PLAN.md chưa?',
                'Duyệt & Bắt đầu Review', 'Mở lại để xem', 'Hủy'
            );

            if (approval === 'Mở lại để xem') {
                const doc = await vscode.workspace.openTextDocument(planPath);
                await vscode.window.showTextDocument(doc, { preview: false });
                return;
            }

            if (approval !== 'Duyệt & Bắt đầu Review') { return; }

            // Chọn mode review
            const mode = await vscode.window.showQuickPick(
                [
                    { label: '$(git-pull-request) Diff Mode', description: 'Review chỉ các thay đổi (diffs)', value: 'diff' as const },
                    { label: '$(file-code) Full Audit', description: 'Review toàn bộ file quan trọng', value: 'full' as const }
                ],
                { placeHolder: 'Chọn chế độ review' }
            );

            if (!mode) { return; }

            try {
                statusBar.showProgress('Đang review code...');
                isReviewRunning = true;

                const resultPath = await reviewEngine.runReview(
                    workspaceFolder.uri.fsPath,
                    mode.value,
                    currentMrUrl
                );

                isReviewRunning = false;

                if (resultPath) {
                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(resultPath));
                    await vscode.window.showTextDocument(doc, { preview: false });
                }

                vscode.window.showInformationMessage(
                    '✅ Review hoàn tất! Xem REVIEW_RESULT.md, sau đó chạy "Duyệt & Đẩy Comment lên SCM" nếu đồng ý.'
                );
                statusBar.showReady();
            } catch (err: any) {
                isReviewRunning = false;
                vscode.window.showErrorMessage(`❌ Lỗi review: ${err.message}`);
                statusBar.reset();
            }
        }
    );

    // 6. Bắt đầu Review (legacy — vẫn hoạt động nhưng ghi file)
    const startReview = vscode.commands.registerCommand(
        'aiCodeReview.startReview',
        async () => {
            // Redirect sang quy trình mới
            await vscode.commands.executeCommand('aiCodeReview.approveReviewPlan');
        }
    );

    // 7. Duyệt & Đẩy Comment lên SCM — NEW
    const publishToSCM = vscode.commands.registerCommand(
        'aiCodeReview.publishToSCM',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('Vui lòng mở một thư mục trước.');
                return;
            }

            // Đọc REVIEW_RESULT.md
            let results: import('./review/reviewResultManager').FileReviewResult[];
            try {
                results = reviewEngine.getResultManager().readResultFile(workspaceFolder.uri.fsPath);
            } catch (err: any) {
                vscode.window.showWarningMessage(err.message);
                return;
            }

            const totalComments = results.reduce((sum: number, r) => sum + r.comments.length, 0);
            if (totalComments === 0) {
                vscode.window.showInformationMessage('✅ Không có comment nào để đẩy lên SCM.');
                return;
            }

            // Xác nhận
            const confirm = await vscode.window.showWarningMessage(
                `Bạn sắp đẩy ${totalComments} comment(s) lên Merge Request. Tiếp tục?`,
                { modal: true },
                'Đẩy lên SCM', 'Hủy'
            );

            if (confirm !== 'Đẩy lên SCM') { return; }

            // Hỏi URL nếu chưa có
            let target;
            try {
                if (currentMrUrl) {
                    target = scmPublisher.parseUrl(currentMrUrl);
                } else {
                    target = await scmPublisher.promptForTarget();
                }
            } catch {
                target = await scmPublisher.promptForTarget();
            }

            if (!target) { return; }

            try {
                statusBar.showProgress('Đang đẩy comment lên SCM...');

                // Thử post từng comment trước
                const { success, failed } = await scmPublisher.publishComments(target, results);

                if (failed > 0 && success === 0) {
                    // Fallback: post 1 comment tổng hợp
                    vscode.window.showWarningMessage(
                        'Không thể post inline comments. Thử post comment tổng hợp...'
                    );
                    const token = authService.getToken();
                    if (token && target.platform === 'gitlab') {
                        const body = scmPublisher.formatReviewAsSingleComment(results);
                        await scmPublisher.postSimpleGitLabComment(target, token, body);
                        vscode.window.showInformationMessage('✅ Đã đẩy comment tổng hợp lên MR!');
                    }
                } else {
                    vscode.window.showInformationMessage(
                        `✅ Đã đẩy ${success} comment lên SCM.${failed > 0 ? ` (${failed} thất bại)` : ''}`
                    );
                }

                statusBar.showReady();
            } catch (err: any) {
                vscode.window.showErrorMessage(`❌ Lỗi đẩy comment: ${err.message}`);
                statusBar.reset();
            }
        }
    );

    // 8. Tạo Mô Tả PR — NEW
    const generatePRDescription = vscode.commands.registerCommand(
        'aiCodeReview.generatePRDescription',
        async () => {
            const source = await vscode.window.showQuickPick(
                [
                    { label: '$(link) Từ URL MR/PR', description: 'Phân tích diff từ GitLab/GitHub', value: 'url' },
                    { label: '$(git-commit) Từ Workspace', description: 'Phân tích thay đổi local', value: 'workspace' }
                ],
                { placeHolder: 'Chọn nguồn dữ liệu' }
            );

            if (!source) { return; }

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('Vui lòng mở một thư mục trước.');
                return;
            }

            try {
                statusBar.showProgress('Đang tạo mô tả PR...');
                let description: string;

                if (source.value === 'url') {
                    const url = await vscode.window.showInputBox({
                        prompt: 'Dán URL Merge Request / Pull Request',
                        placeHolder: 'https://gitlab.com/user/repo/-/merge_requests/1',
                        value: currentMrUrl
                    });
                    if (!url) { return; }
                    description = await prDescGenerator.generateFromUrl(url);
                } else {
                    description = await prDescGenerator.generateFromWorkspace(workspaceFolder.uri.fsPath);
                }

                const filePath = prDescGenerator.writeDescriptionFile(
                    workspaceFolder.uri.fsPath,
                    description
                );

                const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
                await vscode.window.showTextDocument(doc, { preview: false });

                vscode.window.showInformationMessage(
                    '✅ Đã tạo PR_DESCRIPTION.md — Copy nội dung vào MR/PR description.'
                );
                statusBar.showReady();
            } catch (err: any) {
                vscode.window.showErrorMessage(`❌ Lỗi tạo mô tả PR: ${err.message}`);
                statusBar.reset();
            }
        }
    );

    // 9. Cấu hình LLM (updated with Ollama auto-setup)
    const configureLLM = vscode.commands.registerCommand(
        'aiCodeReview.configureLLM',
        async () => {
            const provider = await vscode.window.showQuickPick(
                [
                    { label: 'OpenAI', description: 'GPT-4o, GPT-4-turbo', value: 'openai' },
                    { label: 'Google Gemini', description: 'Gemini 1.5 Pro', value: 'gemini' },
                    { label: 'Anthropic Claude', description: 'Claude 3.5 Sonnet', value: 'claude' },
                    { label: 'Ollama (Local)', description: 'LLM chạy cục bộ — tự động cài đặt', value: 'ollama' }
                ],
                { placeHolder: 'Chọn LLM Provider' }
            );

            if (!provider) { return; }

            const config = vscode.workspace.getConfiguration('aiCodeReview');
            await config.update('llmProvider', provider.value, vscode.ConfigurationTarget.Global);

            if (provider.value === 'ollama') {
                // Endpoint configuration
                const endpoint = await vscode.window.showInputBox({
                    prompt: 'Ollama endpoint',
                    value: config.get<string>('ollamaEndpoint') || 'http://localhost:11434'
                });
                if (endpoint) {
                    await config.update('ollamaEndpoint', endpoint, vscode.ConfigurationTarget.Global);
                }

                // Model configuration
                const model = await vscode.window.showInputBox({
                    prompt: 'Ollama model',
                    value: config.get<string>('llmModel') || 'qwen2.5-coder:7b',
                    placeHolder: 'qwen2.5-coder:7b'
                });
                if (model) {
                    await config.update('llmModel', model, vscode.ConfigurationTarget.Global);
                }

                // Auto-setup: check + install + pull model
                const ready = await ollamaSetup.ensureReady();
                if (!ready) {
                    vscode.window.showWarningMessage('Ollama chưa sẵn sàng. Vui lòng kiểm tra và thử lại.');
                    return;
                }
            } else {
                const authMethod = await vscode.window.showQuickPick(
                    [
                        { label: '$(key) Nhập API Key', description: 'Nhập API Key thủ công', value: 'apikey' }
                    ],
                    { placeHolder: `Cách xác thực cho ${provider.label}` }
                );

                if (authMethod?.value === 'apikey') {
                    const key = await vscode.window.showInputBox({
                        prompt: `API Key cho ${provider.label}`,
                        password: true,
                        placeHolder: 'sk-...'
                    });
                    if (key) {
                        await llmService.storeApiKey(provider.value, key);
                    }
                }
            }

            // Reset provider to pick up new config
            llmService.resetProvider();
            vscode.window.showInformationMessage(`✅ Đã cấu hình LLM: ${provider.label}`);
        }
    );

    // 10. Dừng Review & Giải phóng tài nguyên — NEW
    const stopReview = vscode.commands.registerCommand(
        'aiCodeReview.stopReview',
        async () => {
            statusBar.showProgress('Đang dừng review...');
            isReviewRunning = false;

            // Reset LLM provider
            llmService.resetProvider();

            // Kiểm tra và stop Ollama nếu đang chạy
            const config = vscode.workspace.getConfiguration('aiCodeReview');
            const provider = config.get<string>('llmProvider');

            if (provider === 'ollama') {
                const ollamaRunning = await ollamaSetup.checkRunning();
                if (ollamaRunning) {
                    const shouldStop = await vscode.window.showInformationMessage(
                        'Ollama đang chạy trên máy. Dừng Ollama để giải phóng RAM/GPU?',
                        'Dừng Ollama', 'Để chạy nền'
                    );

                    if (shouldStop === 'Dừng Ollama') {
                        const stopped = await ollamaSetup.stopOllama();
                        if (stopped) {
                            vscode.window.showInformationMessage(
                                '✅ Đã dừng review và giải phóng Ollama. Tài nguyên máy đã được trả lại.'
                            );
                        } else {
                            vscode.window.showWarningMessage(
                                '⚠️ Không thể dừng Ollama tự động. Chạy `pkill ollama` trong Terminal.'
                            );
                        }
                    } else {
                        vscode.window.showInformationMessage('✅ Đã dừng review. Ollama vẫn chạy nền.');
                    }
                } else {
                    vscode.window.showInformationMessage('✅ Đã dừng review. Ollama không đang chạy.');
                }
            } else {
                vscode.window.showInformationMessage('✅ Đã dừng review.');
            }

            statusBar.reset();
        }
    );

    context.subscriptions.push(
        loginGitHub, loginGitLab, scanWorkspace,
        reviewFromUrl, approveReviewPlan, startReview,
        publishToSCM, generatePRDescription, configureLLM,
        stopReview,
        statusBar
    );

    // 11. Đăng ký Webview View Provider — NEW GUI
    const mainViewProvider = new MainViewProvider(context.extensionUri, authService, llmService, ollamaSetup, reviewEngine);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MainViewProvider.viewType, mainViewProvider)
    );
}

export async function deactivate() {
    console.log('AI Code Review extension deactivating...');

    // Tự động stop Ollama khi extension bị deactivate (đóng VS Code)
    try {
        const config = vscode.workspace.getConfiguration('aiCodeReview');
        const provider = config.get<string>('llmProvider');

        if (provider === 'ollama' && ollamaSetup) {
            const running = await ollamaSetup.checkRunning();
            if (running) {
                console.log('Stopping Ollama on deactivate...');
                await ollamaSetup.stopOllama();
            }
            ollamaSetup.dispose();
        }
    } catch {
        // Bỏ qua lỗi khi deactivate
    }

    console.log('AI Code Review extension deactivated');
}
