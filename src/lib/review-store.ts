import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface Review {
    id: string;
    title: string;
    source: "gitlab-mr" | "github-pr" | "custom-url" | "paste";
    sourceUrl?: string;
    status: "pending" | "scanning" | "reviewing" | "completed" | "failed";
    createdAt: string;
    completedAt?: string;
    patternResults?: unknown[];
    aiResults?: string;
    aiAnalysis?: string;
    quickSummary?: string;
    code?: string;
    files?: { name: string; content: string; diff?: string }[];
    contextDocs?: { name: string; text: string }[];
    contextDocuments?: { name: string; content: string }[];
    aiModel?: string;
    customRules?: string;
    userId?: string;
    userName?: string;
    tokenUsage?: number;
}

// SQLite persistent store - shared across all workers via file
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "reviews.db");

function getDb(): Database.Database {
    // Ensure data directory exists (for local dev - Docker has volume mount)
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL"); // Better concurrent read performance
    db.pragma("busy_timeout = 5000");

    // Create table if not exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'paste',
            sourceUrl TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            createdAt TEXT NOT NULL,
            completedAt TEXT,
            patternResults TEXT,
            aiResults TEXT,
            aiAnalysis TEXT,
            code TEXT,
            files TEXT,
            contextDocs TEXT,
            contextDocuments TEXT,
            aiModel TEXT,
            quickSummary TEXT,
            customRules TEXT
        )
    `);

    // Migrate: add columns if missing
    try { db.exec(`ALTER TABLE reviews ADD COLUMN quickSummary TEXT`); } catch { /* already exists */ }
    try { db.exec(`ALTER TABLE reviews ADD COLUMN customRules TEXT`); } catch { /* already exists */ }
    try { db.exec(`ALTER TABLE reviews ADD COLUMN userId TEXT`); } catch { /* already exists */ }
    try { db.exec(`ALTER TABLE reviews ADD COLUMN userName TEXT`); } catch { /* already exists */ }
    try { db.exec(`ALTER TABLE reviews ADD COLUMN tokenUsage INTEGER`); } catch { /* already exists */ }

    // Table for Mobile API impact reports
    db.exec(`
        CREATE TABLE IF NOT EXISTS mobile_api_reports (
            id TEXT PRIMARY KEY,
            versionId TEXT NOT NULL,
            jiraUrl TEXT,
            createdAt TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            jiraIssues TEXT,
            reportMarkdown TEXT,
            summary TEXT,
            userId TEXT,
            userName TEXT
        )
    `);

    // Table for tracking pushed comments to GitLab/GitHub
    db.exec(`
        CREATE TABLE IF NOT EXISTS pushed_comments (
            id TEXT PRIMARY KEY,
            reviewId TEXT NOT NULL,
            commentIndex INTEGER NOT NULL,
            fileName TEXT,
            provider TEXT NOT NULL,
            externalId TEXT,
            pushedAt TEXT NOT NULL,
            FOREIGN KEY (reviewId) REFERENCES reviews(id)
        )
    `);

    return db;
}

function rowToReview(row: Record<string, unknown>): Review {
    return {
        id: row.id as string,
        title: row.title as string,
        source: row.source as Review["source"],
        sourceUrl: row.sourceUrl as string | undefined,
        status: row.status as Review["status"],
        createdAt: row.createdAt as string,
        completedAt: row.completedAt as string | undefined,
        patternResults: row.patternResults ? JSON.parse(row.patternResults as string) : undefined,
        aiResults: row.aiResults as string | undefined,
        aiAnalysis: row.aiAnalysis as string | undefined,
        code: row.code as string | undefined,
        files: row.files ? JSON.parse(row.files as string) : undefined,
        contextDocs: row.contextDocs ? JSON.parse(row.contextDocs as string) : undefined,
        contextDocuments: row.contextDocuments ? JSON.parse(row.contextDocuments as string) : undefined,
        aiModel: row.aiModel as string | undefined,
        quickSummary: row.quickSummary as string | undefined,
        customRules: row.customRules as string | undefined,
        userId: row.userId as string | undefined,
        userName: row.userName as string | undefined,
        tokenUsage: row.tokenUsage as number | undefined,
    };
}

export function createReview(data: Omit<Review, "id" | "createdAt" | "status">): Review {
    const db = getDb();
    const id = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const review: Review = {
        id,
        status: "pending",
        createdAt: new Date().toISOString(),
        ...data,
    };

    const stmt = db.prepare(`
        INSERT INTO reviews (id, title, source, sourceUrl, status, createdAt, completedAt, patternResults, aiResults, aiAnalysis, quickSummary, code, files, contextDocs, contextDocuments, aiModel, customRules, userId, userName, tokenUsage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        review.id,
        review.title,
        review.source,
        review.sourceUrl || null,
        review.status,
        review.createdAt,
        review.completedAt || null,
        review.patternResults ? JSON.stringify(review.patternResults) : null,
        review.aiResults || null,
        review.aiAnalysis || null,
        review.quickSummary || null,
        review.code || null,
        review.files ? JSON.stringify(review.files) : null,
        review.contextDocs ? JSON.stringify(review.contextDocs) : null,
        review.contextDocuments ? JSON.stringify(review.contextDocuments) : null,
        review.aiModel || null,
        review.customRules || null,
        review.userId || null,
        review.userName || null,
        review.tokenUsage || null,
    );

    db.close();
    return review;
}

export function getReview(id: string): Review | undefined {
    const db = getDb();
    const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    db.close();
    return row ? rowToReview(row) : undefined;
}

export function updateReview(id: string, data: Partial<Review>): Review | undefined {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) {
        db.close();
        return undefined;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, (v: unknown) => unknown> = {
        title: (v) => v,
        source: (v) => v,
        sourceUrl: (v) => v,
        status: (v) => v,
        completedAt: (v) => v,
        patternResults: (v) => v ? JSON.stringify(v) : null,
        aiResults: (v) => v,
        aiAnalysis: (v) => v,
        code: (v) => v,
        files: (v) => v ? JSON.stringify(v) : null,
        contextDocs: (v) => v ? JSON.stringify(v) : null,
        contextDocuments: (v) => v ? JSON.stringify(v) : null,
        aiModel: (v) => v,
        quickSummary: (v) => v,
        customRules: (v) => v,
        userId: (v) => v,
        userName: (v) => v,
        tokenUsage: (v) => v,
    };

    for (const [key, transform] of Object.entries(fieldMap)) {
        if (key in data) {
            updates.push(`${key} = ?`);
            values.push(transform((data as Record<string, unknown>)[key]));
        }
    }

    if (updates.length > 0) {
        values.push(id);
        db.prepare(`UPDATE reviews SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id) as Record<string, unknown>;
    db.close();
    return rowToReview(updated);
}

export function listReviews(): Review[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM reviews ORDER BY createdAt DESC LIMIT 50").all() as Record<string, unknown>[];
    db.close();
    return rows.map(rowToReview);
}

export function searchReviews(query: string): Review[] {
    const db = getDb();
    const rows = db.prepare(
        "SELECT * FROM reviews WHERE title LIKE ? ORDER BY createdAt DESC LIMIT 50"
    ).all(`%${query}%`) as Record<string, unknown>[];
    db.close();
    return rows.map(rowToReview);
}

export function getStats(): { totalReviews: number; totalIssues: number; completedToday: number; dailyTokens: number } {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    const countRow = db.prepare("SELECT COUNT(*) as total FROM reviews").get() as { total: number };
    const completedRow = db.prepare(
        "SELECT COUNT(*) as count FROM reviews WHERE status = 'completed' AND completedAt LIKE ?"
    ).get(`${today}%`) as { count: number };

    // Sum all pattern results
    const rows = db.prepare("SELECT patternResults FROM reviews WHERE patternResults IS NOT NULL").all() as { patternResults: string }[];
    const totalIssues = rows.reduce((sum, row) => {
        try {
            return sum + JSON.parse(row.patternResults).length;
        } catch {
            return sum;
        }
    }, 0);

    // Daily token usage
    const tokenRow = db.prepare(
        "SELECT COALESCE(SUM(tokenUsage), 0) as total FROM reviews WHERE createdAt LIKE ?"
    ).get(`${today}%`) as { total: number };

    db.close();

    return {
        totalReviews: countRow.total,
        totalIssues,
        completedToday: completedRow.count,
        dailyTokens: tokenRow.total,
    };
}

export function getDailyTokenUsage(): { total: number; byUser: { userName: string; tokens: number; count: number }[] } {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    const totalRow = db.prepare(
        "SELECT COALESCE(SUM(tokenUsage), 0) as total FROM reviews WHERE createdAt LIKE ?"
    ).get(`${today}%`) as { total: number };

    const byUser = db.prepare(
        `SELECT COALESCE(userName, 'Unknown') as userName, COALESCE(SUM(tokenUsage), 0) as tokens, COUNT(*) as count
         FROM reviews WHERE createdAt LIKE ? GROUP BY userName ORDER BY tokens DESC`
    ).all(`${today}%`) as { userName: string; tokens: number; count: number }[];

    db.close();
    return { total: totalRow.total, byUser };
}

export function deleteAllReviews(): void {
    const db = getDb();
    db.exec("DELETE FROM pushed_comments");
    db.exec("DELETE FROM reviews");
    db.close();
}

export function deleteReview(id: string): boolean {
    const db = getDb();
    db.prepare("DELETE FROM pushed_comments WHERE reviewId = ?").run(id);
    const result = db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
    db.close();
    return result.changes > 0;
}

export function deleteReviews(ids: string[]): number {
    if (ids.length === 0) return 0;
    const db = getDb();
    const placeholders = ids.map(() => "?").join(", ");
    db.prepare(`DELETE FROM pushed_comments WHERE reviewId IN (${placeholders})`).run(...ids);
    const result = db.prepare(`DELETE FROM reviews WHERE id IN (${placeholders})`).run(...ids);
    db.close();
    return result.changes;
}

// Pushed Comments Management
export interface PushedComment {
    id: string;
    reviewId: string;
    commentIndex: number;
    fileName?: string;
    provider: "gitlab" | "github";
    externalId?: string;
    pushedAt: string;
}

export function createPushedComment(data: Omit<PushedComment, "id" | "pushedAt">): PushedComment {
    const db = getDb();
    const id = `pc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pushedComment: PushedComment = {
        id,
        pushedAt: new Date().toISOString(),
        ...data,
    };

    const stmt = db.prepare(`
        INSERT INTO pushed_comments (id, reviewId, commentIndex, fileName, provider, externalId, pushedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        pushedComment.id,
        pushedComment.reviewId,
        pushedComment.commentIndex,
        pushedComment.fileName || null,
        pushedComment.provider,
        pushedComment.externalId || null,
        pushedComment.pushedAt
    );

    db.close();
    return pushedComment;
}

export function getPushedComments(reviewId: string): PushedComment[] {
    const db = getDb();
    const rows = db.prepare(
        "SELECT * FROM pushed_comments WHERE reviewId = ? ORDER BY pushedAt DESC"
    ).all(reviewId) as PushedComment[];
    db.close();
    return rows;
}

export function isCommentPushed(reviewId: string, commentIndex: number, fileName?: string): boolean {
    const db = getDb();
    let query = "SELECT COUNT(*) as count FROM pushed_comments WHERE reviewId = ? AND commentIndex = ?";
    const params: (string | number)[] = [reviewId, commentIndex];

    if (fileName) {
        query += " AND fileName = ?";
        params.push(fileName);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    db.close();
    return result.count > 0;
}

// Mobile API Reports
export interface MobileApiReport {
    id: string;
    versionId: string;
    jiraUrl?: string;
    createdAt: string;
    status: "pending" | "completed" | "error";
    jiraIssues?: { key: string; summary: string; issueType: string }[];
    reportMarkdown?: string;
    summary?: { breaking: number; nonBreaking: number; noImpact: number };
    userId?: string;
    userName?: string;
}

export function createMobileApiReport(data: { versionId: string; jiraUrl?: string; userId?: string; userName?: string }): MobileApiReport {
    const db = getDb();
    const id = `mar-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const report: MobileApiReport = {
        id,
        versionId: data.versionId,
        jiraUrl: data.jiraUrl,
        createdAt: new Date().toISOString(),
        status: "pending",
        userId: data.userId,
        userName: data.userName,
    };

    db.prepare(`
        INSERT INTO mobile_api_reports (id, versionId, jiraUrl, createdAt, status, userId, userName)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(report.id, report.versionId, report.jiraUrl || null, report.createdAt, report.status, report.userId || null, report.userName || null);

    db.close();
    return report;
}

export function updateMobileApiReport(id: string, data: Partial<MobileApiReport>): void {
    const db = getDb();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.status !== undefined) { updates.push("status = ?"); values.push(data.status); }
    if (data.jiraIssues !== undefined) { updates.push("jiraIssues = ?"); values.push(JSON.stringify(data.jiraIssues)); }
    if (data.reportMarkdown !== undefined) { updates.push("reportMarkdown = ?"); values.push(data.reportMarkdown); }
    if (data.summary !== undefined) { updates.push("summary = ?"); values.push(JSON.stringify(data.summary)); }

    if (updates.length > 0) {
        values.push(id);
        db.prepare(`UPDATE mobile_api_reports SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }
    db.close();
}

export function getMobileApiReport(id: string): MobileApiReport | undefined {
    const db = getDb();
    const row = db.prepare("SELECT * FROM mobile_api_reports WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    db.close();
    if (!row) return undefined;
    return {
        id: row.id as string,
        versionId: row.versionId as string,
        jiraUrl: row.jiraUrl as string | undefined,
        createdAt: row.createdAt as string,
        status: row.status as MobileApiReport["status"],
        jiraIssues: row.jiraIssues ? JSON.parse(row.jiraIssues as string) : undefined,
        reportMarkdown: row.reportMarkdown as string | undefined,
        summary: row.summary ? JSON.parse(row.summary as string) : undefined,
        userId: row.userId as string | undefined,
        userName: row.userName as string | undefined,
    };
}

export function listMobileApiReports(): MobileApiReport[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM mobile_api_reports ORDER BY createdAt DESC LIMIT 20").all() as Record<string, unknown>[];
    db.close();
    return rows.map((row) => ({
        id: row.id as string,
        versionId: row.versionId as string,
        jiraUrl: row.jiraUrl as string | undefined,
        createdAt: row.createdAt as string,
        status: row.status as MobileApiReport["status"],
        jiraIssues: row.jiraIssues ? JSON.parse(row.jiraIssues as string) : undefined,
        reportMarkdown: row.reportMarkdown as string | undefined,
        summary: row.summary ? JSON.parse(row.summary as string) : undefined,
        userId: row.userId as string | undefined,
        userName: row.userName as string | undefined,
    }));
}

export function deleteMobileApiReport(id: string): boolean {
    const db = getDb();
    const result = db.prepare("DELETE FROM mobile_api_reports WHERE id = ?").run(id);
    db.close();
    return result.changes > 0;
}
