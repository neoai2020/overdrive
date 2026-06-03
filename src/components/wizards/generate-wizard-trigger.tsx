"use client";

import * as React from "react";
import { GenerateWizard } from "./generate-wizard";

interface Props {
  children: React.ReactNode;
  offerId?: string;
  adSetId?: string;
}

export function GenerateWizardTrigger({ children, offerId, adSetId }: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div onClick={() => setOpen(true)} className="contents">{children}</div>
      <GenerateWizard open={open} onOpenChange={setOpen} initialOfferId={offerId} initialAdSetId={adSetId} />
    </>
  );
}
