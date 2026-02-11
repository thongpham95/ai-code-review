import { getReview } from "@/lib/review-store"

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const review = getReview(id)

    if (!review) {
        return Response.json({ error: "Review not found" }, { status: 404 })
    }

    return Response.json({ review })
}
