import { NextResponse } from "next/server";
import { seed } from "@/lib/db/seed";

export async function POST() {
  try {
    await seed();
    return NextResponse.json({ success: true, message: "Database seeded with Milo, Clover, Pip + The Nocturnal Meadow" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
