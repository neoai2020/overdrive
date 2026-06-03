"use client";

import * as React from "react";
import { CampaignBuilderWizard } from "./campaign-builder-wizard";

export function CampaignBuilderTrigger({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div onClick={() => setOpen(true)} className="contents">{children}</div>
      <CampaignBuilderWizard open={open} onOpenChange={setOpen} />
    </>
  );
}
