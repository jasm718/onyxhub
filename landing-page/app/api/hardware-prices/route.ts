import { NextResponse } from "next/server"

const queryByTechnology = {
  SSD: "https://api.pricepergig.com/drives?technology=eq.SSD&condition=eq.New&capacity_gb=gte.450&capacity_gb=lte.550&marketplace=in.(amazon.com,ebay.com,newegg.com)&select=technology,price,currency,last_updated&limit=50",
} as const

export async function GET(request: Request) {
  const technology = new URL(request.url).searchParams.get("technology") as keyof typeof queryByTechnology | null

  if (!technology || !(technology in queryByTechnology)) {
    return NextResponse.json({ error: "technology must be SSD" }, { status: 400 })
  }

  try {
    const response = await fetch(queryByTechnology[technology], { cache: "no-store" })
    if (!response.ok) {
      return NextResponse.json({ error: "hardware price source unavailable" }, { status: 502 })
    }

    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "hardware price source unavailable" }, { status: 502 })
  }
}
