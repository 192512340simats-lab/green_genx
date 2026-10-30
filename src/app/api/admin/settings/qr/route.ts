import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isSameOrigin, jsonError } from "@/lib/http";
import { deletePublicAssets, publicAssetUrl, UploadError, uploadPublicQr, validateImageUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_QR_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("The QR upload could not be read.", 400);
  }

  let uploadedPath: string | null = null;
  try {
    const image = await validateImageUpload(formData.get("qr"), "Payment QR image", MAX_QR_BYTES);
    const { data: current, error: currentError } = await auth.admin.supabase
      .from("event_settings")
      .select("payment_qr_path")
      .eq("id", 1)
      .single();
    if (currentError || !current) {
      console.error("current QR lookup failed:", currentError?.message);
      return jsonError("Could not load current event settings.", 503);
    }

    uploadedPath = await uploadPublicQr(image);
    const { error: updateError } = await auth.admin.supabase
      .from("event_settings")
      .update({ payment_qr_path: uploadedPath })
      .eq("id", 1);
    if (updateError) {
      console.error("payment QR settings update failed:", updateError.message);
      await deletePublicAssets([uploadedPath]);
      return jsonError("Could not save the new payment QR.", 500);
    }

    if (current.payment_qr_path !== uploadedPath) await deletePublicAssets([current.payment_qr_path]);
    const url = publicAssetUrl(uploadedPath);
    if (!url) return jsonError("The QR image was saved, but its public URL is unavailable.", 503);
    return NextResponse.json({ ok: true, url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("payment QR upload failed:", error);
    if (uploadedPath) await deletePublicAssets([uploadedPath]);
    if (error instanceof UploadError) return jsonError(error.message, 400);
    return jsonError("Could not upload the payment QR. Please try again.", 500);
  }
}
