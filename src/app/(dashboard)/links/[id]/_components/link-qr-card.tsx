"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkQrCode } from "@/components/link-qr-code";
import { buildShortUrl } from "@/lib/services/redirectLinkService";

/** QR code du lien court, téléchargeable en SVG (impression) et PNG. */
export function LinkQrCard({ slug }: { slug: string }) {
  const shortUrl = buildShortUrl(slug);

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR code</CardTitle>
        <CardDescription className="break-all">{shortUrl}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <LinkQrCode slug={slug} />
        <p className="text-center text-xs text-muted-foreground">
          Le QR code encode l&apos;URL courte : la destination reste modifiable
          après impression.
        </p>
      </CardContent>
    </Card>
  );
}
