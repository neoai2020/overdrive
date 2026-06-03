"use client";

import { HeroCreate } from "./hero-create";

/** Bridges server home page → client hero (opens wizards via window events). */
export function HeroCreateBridge() {
  return (
    <HeroCreate
      onNewCampaign={() => window.dispatchEvent(new CustomEvent("od:open-campaign-builder"))}
      onGenerateAds={() => window.dispatchEvent(new CustomEvent("od:open-generate-wizard"))}
    />
  );
}
