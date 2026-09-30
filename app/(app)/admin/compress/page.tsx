import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/admin/requireAdmin";
import { CompressAdminPanel } from "@/components/admin/CompressAdminPanel";

export default async function AdminCompressPage() {
  // middleware.ts already returns a real 403 for any non-admin request to
  // this path before this component ever runs — this is a second,
  // independent check. A page component can't itself return a raw 403
  // response (only a Route Handler can), so this uses notFound() as the
  // closest equivalent if it's ever reached without the gate above.
  const allowed = await isCurrentUserAdmin();
  if (!allowed) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-text">Storage komprimieren</h1>
      <p className="mt-1 text-sm text-muted">
        Einmaliges Werkzeug, um alle bestehenden Bilder in Supabase Storage zu verkleinern.
        Pfade, Dateiformate und DB-Einträge bleiben unverändert.
      </p>

      <CompressAdminPanel />
    </div>
  );
}
