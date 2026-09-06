import type { Metadata } from "next";
import { notFound } from "next/navigation";

import GoldScoringReportView from "@/components/gold-scoring-report";

// Unauthenticated by design (outside the /admin,/upload,/papers prefixes
// proxy.ts gates) -- the unguessable token in the path is the only guard,
// so a wrong token 404s rather than 403ing to avoid confirming the route
// exists at all.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedGoldScoringPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shareToken = process.env.GOLD_SCORING_SHARE_TOKEN;

  if (!shareToken || token !== shareToken) {
    notFound();
  }

  return (
    <main className="soales-page min-h-dvh p-6 md:p-16">
      <div className="mx-auto w-full max-w-[1440px]">
        <GoldScoringReportView />
      </div>
    </main>
  );
}
