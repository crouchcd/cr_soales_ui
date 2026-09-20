import type { Metadata } from "next";

import PromptExperimentRunner from "@/components/prompt-experiment-runner";

// Unauthenticated by design, like app/(public)/reports/gold-scoring/[token] --
// this page is deliberately outside /admin's shared cookie gate (spec §3):
// each researcher's own owner token is the credential, entered into the
// page itself, never put in the URL.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PromptExperimentPage() {
  return (
    <main className="soales-page min-h-dvh p-6 md:p-16">
      <div className="mx-auto grid w-full max-w-[1440px] gap-6">
        <header>
          <h1 className="soales-subheading mt-3 text-3xl tracking-[-0.02em] text-[#dae2fd] md:text-5xl">
            Prompt Experiment
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#ccc3d8] md:text-base">
            Test your own extraction-prompt manifest against the gold-standard papers. Your
            manifest is resolved automatically from your owner token -- nothing to upload.
          </p>
        </header>
        <PromptExperimentRunner />
      </div>
    </main>
  );
}
