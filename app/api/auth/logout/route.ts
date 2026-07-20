import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/absolute-url";

const COOKIE_NAME = "cr_soales_access";

export async function POST(request: Request) {
  const response = NextResponse.redirect(absoluteUrl(request, "/login"), 303);
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
