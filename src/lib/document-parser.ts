/**
 * Document parser: converts uploaded files to plain text
 * for use as AI context during code review.
 */

export async function parseDocument(buffer: Buffer, filename: string): Promise<string> {
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    switch (ext) {
        case "txt":
        case "md":
        case "csv":
            return buffer.toString("utf-8");

        case "pdf":
            return parsePdf(buffer);

        case "doc":
        case "docx":
            return parseDocx(buffer);

        case "xls":
        case "xlsx":
            return parseExcel(buffer);

        case "drawio":
        case "xml":
            return parseDrawio(buffer);

        default:
            // Try as text
            return buffer.toString("utf-8");
    }
}

async function parsePdf(buffer: Buffer): Promise<string> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        console.error("PDF parse error:", error);
        return "[Error: Could not parse PDF file]";
    }
}

async function parseDocx(buffer: Buffer): Promise<string> {
    try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error("DOCX parse error:", error);
        return "[Error: Could not parse Word document]";
    }
}

async function parseExcel(buffer: Buffer): Promise<string> {
    try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const lines: string[] = [];

        for (const sheetName of workbook.SheetNames) {
            lines.push(`\n--- Sheet: ${sheetName} ---`);
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            lines.push(csv);
        }
        return lines.join("\n");
    } catch (error) {
        console.error("Excel parse error:", error);
        return "[Error: Could not parse Excel file]";
    }
}

function parseDrawio(buffer: Buffer): string {
    // draw.io files are XML, extract text content
    const xml = buffer.toString("utf-8");
    // Extract label values from draw.io XML
    const labels: string[] = [];
    const labelRegex = /value="([^"]*)"/g;
    let match;
    while ((match = labelRegex.exec(xml)) !== null) {
        if (match[1].trim()) {
            labels.push(match[1].trim());
        }
    }
    return labels.length > 0
        ? `Flowchart content:\n${labels.join("\n")}`
        : xml;
}

/**
 * Parse a Figma URL to extract basic info.
 * Full Figma API integration would need an API token.
 */
export function parseFigmaUrl(url: string): { fileId: string; nodeId?: string } | null {
    try {
        const u = new URL(url);
        if (!u.hostname.includes("figma.com")) return null;

        // https://www.figma.com/file/FILE_ID/Title?node-id=NODE_ID
        // https://www.figma.com/design/FILE_ID/Title?node-id=NODE_ID
        const pathParts = u.pathname.split("/");
        const fileIndex = pathParts.findIndex((p) => p === "file" || p === "design");
        if (fileIndex === -1 || !pathParts[fileIndex + 1]) return null;

        return {
            fileId: pathParts[fileIndex + 1],
            nodeId: u.searchParams.get("node-id") || undefined,
        };
    } catch {
        return null;
    }
}

/**
 * Parse a Mermaid chart string to plain text description
 */
export function parseMermaid(content: string): string {
    // Simply return the mermaid content as context
    return `Mermaid Chart:\n${content}`;
}
