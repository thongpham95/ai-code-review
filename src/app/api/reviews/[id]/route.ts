import { getReview, updateReview, getPushedComments } from "@/lib/review-store"

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const review = getReview(id)

    if (!review) {
        return Response.json({ error: "Review not found" }, { status: 404 })
    }

    const pushedComments = getPushedComments(id)
    return Response.json({ review, pushedComments })
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()

        const existing = getReview(id)
        if (!existing) {
            return Response.json({ error: "Review not found" }, { status: 404 })
        }

        const updated = updateReview(id, body)

        if (!updated) {
            return Response.json({ error: "Failed to update review" }, { status: 500 })
        }

        return Response.json({ review: updated })
    } catch (error) {
        console.error("Update review error:", error)
        return Response.json({ error: "Failed to update review" }, { status: 500 })
    }
}
