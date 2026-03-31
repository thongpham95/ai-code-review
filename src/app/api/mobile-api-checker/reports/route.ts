import { listMobileApiReports, deleteMobileApiReport } from "@/lib/review-store"

export async function GET() {
    const reports = listMobileApiReports()
    return Response.json(reports)
}

export async function DELETE(req: Request) {
    const { id } = await req.json()
    if (!id) {
        return Response.json({ error: "Missing report id" }, { status: 400 })
    }
    const deleted = deleteMobileApiReport(id)
    return Response.json({ deleted })
}
