import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'aiCodeReview.configureLLM';
        this.reset();
        this.statusBarItem.show();
    }

    /** Trạng thái mặc định */
    reset(): void {
        this.statusBarItem.text = '$(comment-discussion) AI Review';
        this.statusBarItem.tooltip = 'Click để cấu hình AI Code Review';
        this.statusBarItem.backgroundColor = undefined;
    }

    /** Hiển thị user đã đăng nhập */
    showUser(name: string, platform: string): void {
        const icon = platform === 'github' ? '$(github)' : '$(git-merge)';
        this.statusBarItem.text = `${icon} ${name}`;
        this.statusBarItem.tooltip = `Đã đăng nhập ${platform}: ${name}`;
    }

    /** Hiển thị đang xử lý */
    showProgress(message: string): void {
        this.statusBarItem.text = `$(sync~spin) ${message}`;
        this.statusBarItem.tooltip = message;
    }

    /** Hiển thị sẵn sàng review */
    showReady(): void {
        this.statusBarItem.text = '$(pass) AI Review: Sẵn sàng';
        this.statusBarItem.tooltip = 'Review hoàn tất. Click để cấu hình.';
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
